from pydantic import BaseModel, Field


class ExportRequest(BaseModel):
    format: str = Field("xlsx", pattern="^(xlsx|csv|pdf)$")


class ExportResponse(BaseModel):
    filename: str
    format: str
    size_bytes: int
