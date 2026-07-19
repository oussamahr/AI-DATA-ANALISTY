from app.services.data_loader import (
    load_dataframe,
    infer_column_dtype,
    compute_histogram,
    compute_top_values,
    coerce_numeric,
)


class AnalyticsService:
    def __init__(self, db: AsyncSession = Depends(get_session)):
        self.db = db

    async def _get_dataset(self, dataset_id: str, user: User) -> Dataset:
        try:
            uid = uuid.UUID(dataset_id)
        except ValueError:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid dataset ID")
        result = await self.db.execute(
            select(Dataset).where(
                Dataset.id == uid,
                Dataset.is_deleted == False,
            )
        )
        ds = result.scalar_one_or_none()
        if ds is None:
            raise AppException("Dataset not found", 404)
        if user.tenant_id and ds.tenant_id != user.tenant_id:
            raise AppException("Access denied", 403)
        return ds

    async def run_profile(
        self, dataset_id: str, user: User, force: bool = False
    ) -> list[DataProfile]:
        ds = await self._get_dataset(dataset_id, user)

        await self.db.execute(delete(DataProfile).where(DataProfile.dataset_id == ds.id))

        df = load_dataframe(ds.file_path)
        profiles = []

        for col_name in df.columns:
            series = df[col_name]
            total = len(series)
            null_count = int(series.isna().sum())
            dtype = infer_column_dtype(series)
            cleaned = series.dropna()

            profile = DataProfile(
                id=uuid.uuid4(),
                dataset_id=ds.id,
                column_name=str(col_name),
                dtype=dtype,
                null_count=null_count,
                total_count=total,
                unique_count=int(cleaned.nunique()),
                top_values=compute_top_values(cleaned),
            )

            if dtype == "numeric" and len(cleaned) > 0:
                nums = cleaned.astype(float)
                profile.min_val = str(nums.min()) if not nums.empty else None
                profile.max_val = str(nums.max()) if not nums.empty else None
                profile.mean = coerce_numeric(nums.mean())
                profile.median = coerce_numeric(nums.median())
                profile.std = coerce_numeric(nums.std())
                profile.histogram = compute_histogram(nums)
            elif dtype == "datetime" and len(cleaned) > 0:
                profile.min_val = str(cleaned.min())
                profile.max_val = str(cleaned.max())
            else:
                vals = cleaned.astype(str)
                profile.min_val = vals.min() if not vals.empty else None
                profile.max_val = vals.max() if not vals.empty else None

            self.db.add(profile)
            profiles.append(profile)

        ds.row_count = len(df)
        ds.column_definitions = json.dumps(
            {
                col: str(dtype)
                for col, dtype in zip(df.columns, [p.dtype for p in profiles], strict=False)
            }
        )

        await self.db.flush()
        return profiles

    async def get_profiles(self, dataset_id: str, user: User) -> list[DataProfile]:
        await self._get_dataset(dataset_id, user)
        result = await self.db.execute(
            select(DataProfile)
            .where(DataProfile.dataset_id == uuid.UUID(dataset_id))
            .order_by(DataProfile.column_name)
        )
        return list(result.scalars().all())

    async def run_correlation_analysis(self, dataset_id: str, user: User) -> AnalysisResult:
        ds = await self._get_dataset(dataset_id, user)
        profiles = await self.get_profiles(dataset_id, user)
        numeric_cols = [p.column_name for p in profiles if p.dtype == "numeric"]

        df = load_dataframe(ds.file_path)

        if not numeric_cols:
            numeric_cols = df.select_dtypes(include=[np.number]).columns.tolist()

        run = AnalysisRun(
            id=uuid.uuid4(),
            dataset_id=ds.id,
            user_id=user.id,
            analysis_type="correlation",
            status="running",
        )
        self.db.add(run)
        await self.db.flush()

        try:
            valid_cols = [c for c in numeric_cols if c in df.columns]
            if len(valid_cols) < 2:
                raise AppException("Need at least 2 numeric columns for correlation", 400)

            numeric_df = df[valid_cols].select_dtypes(include=[np.number]).dropna()
            if len(numeric_df) < 2:
                raise AppException("Insufficient numeric data after cleaning", 400)

            corr_matrix = numeric_df.corr().to_dict()

            correlations = []
            for i, c1 in enumerate(valid_cols):
                for c2 in valid_cols[i + 1 :]:
                    val = corr_matrix.get(c1, {}).get(c2)
                    if val is not None and not (isinstance(val, float) and math.isnan(val)):
                        correlations.append(
                            {
                                "column_1": c1,
                                "column_2": c2,
                                "correlation": round(float(val), 4),
                            }
                        )

            data = {
                "numeric_columns": valid_cols,
                "correlations": correlations,
                "matrix": {
                    "columns": valid_cols,
                    "values": [
                        [corr_matrix.get(c1, {}).get(c2) for c2 in valid_cols] for c1 in valid_cols
                    ],
                },
            }

            result = AnalysisResult(
                id=uuid.uuid4(),
                analysis_run_id=run.id,
                dataset_id=ds.id,
                result_type="correlation_matrix",
                data=data,
            )
            self.db.add(result)

            run.status = "completed"
            run.completed_at = datetime.now(UTC)
            await self.db.flush()
            return result

        except AppException:
            run.status = "failed"
            run.completed_at = datetime.now(UTC)
            run.error_message = "Correlation analysis failed"
            await self.db.flush()
            raise

    async def run_full_analysis(self, dataset_id: str, user: User) -> AnalysisResult:
        ds = await self._get_dataset(dataset_id, user)

        run = AnalysisRun(
            id=uuid.uuid4(),
            dataset_id=ds.id,
            user_id=user.id,
            analysis_type="comprehensive",
            status="running",
        )
        self.db.add(run)
        await self.db.flush()

        try:
            profiles = await self.run_profile(dataset_id, user, force=True)
            df = load_dataframe(ds.file_path)
            numeric_cols = [p.column_name for p in profiles if p.dtype == "numeric"]

            sections = []

            profile_data = [
                {
                    "column_name": p.column_name,
                    "dtype": p.dtype,
                    "null_count": p.null_count,
                    "total_count": p.total_count,
                    "null_percent": round(p.null_count / max(p.total_count, 1) * 100, 2),
                    "unique_count": p.unique_count,
                    "unique_percent": round(p.unique_count / max(p.total_count, 1) * 100, 2),
                    "mean": p.mean,
                    "median": p.median,
                    "std": p.std,
                    "min": p.min_val,
                    "max": p.max_val,
                    "top_values": p.top_values,
                    "histogram": p.histogram,
                }
                for p in profiles
            ]
            sections.append(
                {"title": "Column Profiles", "content": profile_data, "type": "profiles"}
            )

            if len(numeric_cols) >= 2:
                numeric_df = df[numeric_cols].select_dtypes(include=[np.number]).dropna()
                if len(numeric_df) >= 2:
                    corr_matrix = numeric_df.corr()
                    corr_data = []
                    for i, c1 in enumerate(numeric_cols):
                        for c2 in numeric_cols[i + 1 :]:
                            val = corr_matrix.loc[c1, c2]
                            if not (isinstance(val, float) and math.isnan(val)):
                                corr_data.append(
                                    {
                                        "column_1": c1,
                                        "column_2": c2,
                                        "correlation": round(float(val), 4),
                                    }
                                )
                    sections.append(
                        {"title": "Correlations", "content": corr_data, "type": "correlations"}
                    )

            data = {
                "dataset_id": str(ds.id),
                "dataset_name": ds.name,
                "row_count": len(df),
                "column_count": len(df.columns),
                "sections": sections,
            }

            result = AnalysisResult(
                id=uuid.uuid4(),
                analysis_run_id=run.id,
                dataset_id=ds.id,
                result_type="report",
                data=data,
            )
            self.db.add(result)

            run.status = "completed"
            run.completed_at = datetime.now(UTC)
            await self.db.flush()
            return result

        except AppException:
            run.status = "failed"
            run.completed_at = datetime.now(UTC)
            run.error_message = "Analysis failed"
            await self.db.flush()
            raise

    async def get_report(self, dataset_id: str, user: User) -> AnalysisResult | None:
        await self._get_dataset(dataset_id, user)
        result = await self.db.execute(
            select(AnalysisResult)
            .where(
                AnalysisResult.dataset_id == uuid.UUID(dataset_id),
                AnalysisResult.result_type == "report",
            )
            .order_by(AnalysisResult.created_at.desc())
            .limit(1)
        )
        return result.scalar_one_or_none()

    async def list_runs(self, dataset_id: str | None, user: User) -> list[AnalysisRun]:
        query = (
            select(AnalysisRun)
            .join(Dataset, AnalysisRun.dataset_id == Dataset.id)
            .where(Dataset.tenant_id == user.tenant_id)
            .order_by(AnalysisRun.created_at.desc())
        )
        if dataset_id:
            query = query.where(AnalysisRun.dataset_id == uuid.UUID(dataset_id))
        result = await self.db.execute(query)
        return list(result.scalars().all())

    async def get_run(self, run_id: str, user: User) -> AnalysisRun | None:
        run = await self.db.get(AnalysisRun, uuid.UUID(run_id))
        if run is None:
            raise AppException("Analysis run not found", 404)
        ds = await self.db.get(Dataset, run.dataset_id)
        if ds and user.tenant_id and ds.tenant_id != user.tenant_id:
            raise AppException("Access denied", 403)
        return run
