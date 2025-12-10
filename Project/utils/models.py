# models.py
from pydantic import BaseModel, Field, validator
from typing import List, Optional, Dict, Any
from datetime import datetime
from enum import Enum


class HubStatus(str, Enum):
    IDLE = "idle"
    PROCESSING = "processing"
    READY = "ready"
    ERROR = "error"


# Request Models
class SharePointIngestRequest(BaseModel):
    sharepoint_link: str = Field(..., description="SharePoint folder/file link")
    hub_name: str = Field(..., min_length=1, max_length=100, description="Unique hub identifier")
    auto_sync: bool = Field(default=False, description="Enable automatic sync")
    
    @validator('hub_name')
    def validate_hub_name(cls, v):
        if not v.replace('_', '').replace('-', '').isalnum():
            raise ValueError('Hub name must be alphanumeric with underscores/hyphens only')
        return v


class FileUploadIngestRequest(BaseModel):
    hub_name: str = Field(..., min_length=1, max_length=100)


class LoadHubRequest(BaseModel):
    hub_name: str


class ChatRequest(BaseModel):
    query: str = Field(..., min_length=1, max_length=2000)
    hub_name: str = Field(..., description="Hub to query against")
    include_sources: bool = Field(default=True, description="Include source documents in response")


class SyncRequest(BaseModel):
    hub_name: str
    force: bool = Field(default=False, description="Force sync even if no changes detected")


# Response Models
class FileMetadata(BaseModel):
    id: str
    name: str
    etag: str
    size: int
    lastModifiedDateTime: str


class HubInfo(BaseModel):
    hub_name: str
    status: HubStatus
    file_count: int
    created_at: Optional[datetime]
    last_synced: Optional[datetime]
    sharepoint_linked: bool
    auto_sync_enabled: bool


class HubDetailResponse(BaseModel):
    hub_name: str
    status: HubStatus
    files: List[FileMetadata]
    manifest: Dict[str, Any]
    metadata: Dict[str, Any]


class HubListResponse(BaseModel):
    hubs: List[HubInfo]
    total: int


class IngestResponse(BaseModel):
    hub_name: str
    status: str
    message: str
    files_processed: int
    processing_time: float


class ChatResponse(BaseModel):
    query: str
    answer: str
    sources: Optional[List[Dict[str, Any]]] = None
    hub_name: str
    timestamp: datetime = Field(default_factory=datetime.utcnow)


class SyncResponse(BaseModel):
    hub_name: str
    status: str
    changes_detected: bool
    files_updated: int
    message: str


class ErrorResponse(BaseModel):
    error: str
    detail: Optional[str] = None
    timestamp: datetime = Field(default_factory=datetime.utcnow)


class HealthResponse(BaseModel):
    status: str
    timestamp: datetime = Field(default_factory=datetime.utcnow)