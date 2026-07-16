import io
import logging
from typing import BinaryIO

from app.core.config import settings

logger = logging.getLogger(__name__)


class ClamAVScanner:
    def __init__(self):
        self.enabled = settings.CLAMAV_ENABLED
        self.host = settings.CLAMAV_HOST
        self.port = settings.CLAMAV_PORT

    async def scan_stream(self, stream: BinaryIO) -> tuple[bool, str | None]:
        if not self.enabled:
            return True, None

        try:
            import pyclamd
            cd = pyclamd.ClamdNetworkSocket(self.host, self.port)
            
            content = stream.read()
            stream.seek(0)
            
            result = cd.scan_stream(content)
            
            if result is None:
                return True, None
            else:
                virus_name = result.get("stream", ["unknown"])[0]
                logger.warning(f"Malware detected: {virus_name}")
                return False, f"Malware detected: {virus_name}"
                
        except Exception as e:
            logger.error(f"ClamAV scan failed: {e}")
            if settings.is_production():
                return False, f"Antivirus scan failed: {str(e)}"
            else:
                logger.warning("ClamAV unavailable in development mode, allowing file")
                return True, None

    async def scan_bytes(self, content: bytes) -> tuple[bool, str | None]:
        stream = io.BytesIO(content)
        return await self.scan_stream(stream)


scanner = ClamAVScanner()
