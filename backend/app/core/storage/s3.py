import io
import logging
from typing import BinaryIO

from app.core.config import settings

logger = logging.getLogger(__name__)


class S3Storage:
    def __init__(self):
        self.endpoint = settings.S3_ENDPOINT
        self.access_key = settings.S3_ACCESS_KEY
        self.secret_key = settings.S3_SECRET_KEY
        self.bucket_prefix = settings.S3_BUCKET_PREFIX
        self.use_ssl = settings.S3_USE_SSL
        self._client = None

    def _get_client(self):
        if self._client is None:
            import boto3
            self._client = boto3.client(
                "s3",
                endpoint_url=f"{'https' if self.use_ssl else 'http'}://{self.endpoint}",
                aws_access_key_id=self.access_key,
                aws_secret_access_key=self.secret_key,
            )
        return self._client

    def _get_bucket_name(self, tenant_id: str) -> str:
        return f"{self.bucket_prefix}-{tenant_id}"

    async def ensure_bucket(self, tenant_id: str):
        client = self._get_client()
        bucket = self._get_bucket_name(tenant_id)
        try:
            client.head_bucket(Bucket=bucket)
        except Exception:
            try:
                client.create_bucket(Bucket=bucket)
                logger.info(f"Created bucket: {bucket}")
            except Exception as e:
                logger.error(f"Failed to create bucket {bucket}: {e}")
                raise

    async def upload_file(
        self, file: BinaryIO, tenant_id: str, key: str, content_type: str = "application/octet-stream"
    ) -> str:
        client = self._get_client()
        bucket = self._get_bucket_name(tenant_id)
        await self.ensure_bucket(tenant_id)
        
        client.upload_fileobj(
            file,
            bucket,
            key,
            ExtraArgs={"ContentType": content_type},
        )
        
        return f"s3://{bucket}/{key}"

    async def download_file(self, tenant_id: str, key: str) -> bytes:
        client = self._get_client()
        bucket = self._get_bucket_name(tenant_id)
        
        buffer = io.BytesIO()
        client.download_fileobj(bucket, key, buffer)
        buffer.seek(0)
        return buffer.read()

    async def delete_file(self, tenant_id: str, key: str):
        client = self._get_client()
        bucket = self._get_bucket_name(tenant_id)
        client.delete_object(Bucket=bucket, Key=key)

    async def get_presigned_url(self, tenant_id: str, key: str, expiration: int = 3600) -> str:
        client = self._get_client()
        bucket = self._get_bucket_name(tenant_id)
        return client.generate_presigned_url(
            "get_object",
            Params={"Bucket": bucket, "Key": key},
            ExpiresIn=expiration,
        )


s3_storage = S3Storage()
