import io

import pytest
from fastapi import UploadFile
from app.core.security.validators import (
    validate_file_extension,
    validate_file_size,
    validate_magic_bytes,
)
from app.services.dataset_service import DatasetService
from unittest.mock import patch, AsyncMock


class TestFileExtensionValidation:
    def test_valid_csv(self):
        validate_file_extension("data.csv")

    def test_valid_parquet(self):
        validate_file_extension("data.parquet")

    def test_valid_xlsx(self):
        validate_file_extension("report.xlsx")

    def test_valid_json(self):
        validate_file_extension("data.json")

    def test_valid_tsv(self):
        validate_file_extension("data.tsv")

    def test_valid_feather(self):
        validate_file_extension("data.feather")

    def test_reject_exe(self):
        with pytest.raises(Exception):
            validate_file_extension("malware.exe")

    def test_reject_bat(self):
        with pytest.raises(Exception):
            validate_file_extension("script.bat")

    def test_reject_sh(self):
        with pytest.raises(Exception):
            validate_file_extension("script.sh")

    def test_reject_double_extension(self):
        with pytest.raises(Exception):
            validate_file_extension("data.csv.exe")

    def test_reject_php(self):
        with pytest.raises(Exception):
            validate_file_extension("shell.php")

    def test_reject_svg(self):
        with pytest.raises(Exception):
            validate_file_extension("image.svg")


class TestFileSizeValidation:
    def test_valid_size(self):
        file = UploadFile(filename="test.csv", file=io.BytesIO(b"x" * 1000))
        validate_file_size(file)

    def test_oversized_file(self):
        file = UploadFile(filename="test.csv", file=io.BytesIO(b"x" * (200 * 1024 * 1024 + 1)))
        with pytest.raises(Exception):
            validate_file_size(file)


class TestMagicByteValidation:
    @pytest.mark.asyncio
    async def test_csv_magic_bytes_skipped(self):
        file = UploadFile(filename="test.csv", file=io.BytesIO(b"name,age\nAlice,30\n"))
        await validate_magic_bytes(file, ".csv")

    @pytest.mark.asyncio
    async def test_parquet_magic_bytes_pass(self):
        file = UploadFile(filename="test.parquet", file=io.BytesIO(b"PAR1" + b"\x00" * 100))
        await validate_magic_bytes(file, ".parquet")

    @pytest.mark.asyncio
    async def test_xlsx_with_wrong_header_rejected(self):
        file = UploadFile(filename="test.xlsx", file=io.BytesIO(b"PK\x03\x04" + b"\x00" * 100))
        with pytest.raises(Exception):
            await validate_magic_bytes(file, ".xlsx")

    @pytest.mark.asyncio
    async def test_json_magic_bytes_pass(self):
        file = UploadFile(filename="test.json", file=io.BytesIO(b'{"key": "value"}'))
        await validate_magic_bytes(file, ".json")

    @pytest.mark.asyncio
    async def test_json_with_exe_header_rejected(self):
        file = UploadFile(filename="test.json", file=io.BytesIO(b"MZ\x90\x00" + b'{"key": "value"}'))
        with pytest.raises(Exception):
            await validate_magic_bytes(file, ".json")

    @pytest.mark.asyncio
    async def test_unsupported_ext_skipped(self):
        file = UploadFile(filename="test.txt", file=io.BytesIO(b"content"))
        await validate_magic_bytes(file, ".txt")


class TestStorageQuota:
    @pytest.mark.asyncio
    async def test_quota_exceeded_rejects_upload(self, db):
        from app.models.tenant import Tenant
        from app.models.user import User
        from app.core.security.auth import hash_password

        tenant = Tenant(name="Quota Test", storage_quota_bytes=100)
        db.add(tenant)
        await db.flush()

        user = User(
            email="quota@test.com",
            hashed_password=hash_password("TestPass123!"),
            tenant_id=tenant.id,
        )
        db.add(user)
        await db.flush()

        service = DatasetService.__new__(DatasetService)
        service.db = db

        with pytest.raises(Exception) as exc_info:
            await service._check_storage_quota(str(tenant.id), 200)
        assert "quota" in str(exc_info.value.detail).lower()

    @pytest.mark.asyncio
    async def test_quota_not_exceeded_allows_upload(self, db):
        from app.models.tenant import Tenant
        from app.models.user import User
        from app.core.security.auth import hash_password

        tenant = Tenant(name="Quota Test", storage_quota_bytes=1000000)
        db.add(tenant)
        await db.flush()

        user = User(
            email="quota2@test.com",
            hashed_password=hash_password("TestPass123!"),
            tenant_id=tenant.id,
        )
        db.add(user)
        await db.flush()

        service = DatasetService.__new__(DatasetService)
        service.db = db

        await service._check_storage_quota(str(tenant.id), 100)


class TestMetadataExtraction:
    @pytest.mark.asyncio
    async def test_csv_metadata(self):
        service = DatasetService.__new__(DatasetService)
        content = b"name,age,city\nAlice,30,NYC\nBob,25,LA\n"
        row_count, columns = await service._extract_metadata(content, ".csv")
        assert row_count == 2
        assert len(columns) == 3
        assert columns[0]["name"] == "name"

    @pytest.mark.asyncio
    async def test_json_metadata(self):
        service = DatasetService.__new__(DatasetService)
        content = b'[{"name": "Alice"}, {"name": "Bob"}]'
        row_count, columns = await service._extract_metadata(content, ".json")
        assert row_count == 2
        assert len(columns) == 1

    @pytest.mark.asyncio
    async def test_unsupported_format_returns_empty(self):
        service = DatasetService.__new__(DatasetService)
        row_count, columns = await service._extract_metadata(b"test", ".unknown")
        assert row_count == 0
        assert columns == []


class TestClamAVIntegration:
    @pytest.mark.asyncio
    async def test_clean_file_passes(self):
        from app.core.security.scanner import scanner

        file = UploadFile(
            filename="clean.txt",
            file=io.BytesIO(b"This is clean content"),
        )
        is_clean, info = await scanner.scan_stream(file)
        assert is_clean is True

    @pytest.mark.asyncio
    async def test_clamav_disabled_passes(self):
        with patch("app.core.security.scanner.settings") as mock_settings:
            mock_settings.CLAMAV_ENABLED = False
            mock_settings.STORAGE_BACKEND = "local"
            from app.core.security import scanner as scanner_mod
            old = scanner_mod.scanner.enabled
            scanner_mod.scanner.enabled = False
            try:
                file = UploadFile(
                    filename="test.txt",
                    file=io.BytesIO(b"content"),
                )
                is_clean, info = await scanner_mod.scanner.scan_stream(file)
                assert is_clean is True
            finally:
                scanner_mod.scanner.enabled = old
