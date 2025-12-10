# services/sharepoint.py
import requests
import base64
from typing import Dict, List, Any
from functools import lru_cache
import time


class SharePointClient:
    """SharePoint Graph API client with caching"""
    
    def __init__(self, tenant_id: str, client_id: str, client_secret: str):
        self.tenant_id = tenant_id
        self.client_id = client_id
        self.client_secret = client_secret
        self._token = None
        self._token_expiry = 0
    
    def get_access_token(self) -> str:
        """Get or refresh access token"""
        if self._token and time.time() < self._token_expiry:
            return self._token
        
        token_url = f"https://login.microsoftonline.com/{self.tenant_id}/oauth2/v2.0/token"
        token_data = {
            "grant_type": "client_credentials",
            "client_id": self.client_id,
            "client_secret": self.client_secret,
            "scope": "https://graph.microsoft.com/.default"
        }
        
        response = requests.post(token_url, data=token_data)
        response.raise_for_status()
        token_json = response.json()
        
        self._token = token_json["access_token"]
        self._token_expiry = time.time() + token_json.get("expires_in", 3600) - 300  # 5 min buffer
        
        return self._token
    
    def share_link_to_drive_item(self, share_link: str) -> Dict[str, Any]:
        """Convert SharePoint share link to drive item metadata"""
        token = self.get_access_token()
        
        encoded_url = base64.urlsafe_b64encode(
            share_link.strip().encode("utf-8")
        ).decode("utf-8").rstrip("=")
        
        meta_url = f"https://graph.microsoft.com/v1.0/shares/u!{encoded_url}/driveItem"
        headers = {"Authorization": f"Bearer {token}"}
        
        response = requests.get(meta_url, headers=headers)
        response.raise_for_status()
        
        return response.json()
    
    def list_children(self, drive_id: str, item_id: str) -> List[Dict[str, Any]]:
        """List children of a folder item"""
        token = self.get_access_token()
        url = f"https://graph.microsoft.com/v1.0/drives/{drive_id}/items/{item_id}/children"
        headers = {"Authorization": f"Bearer {token}"}
        
        response = requests.get(url, headers=headers)
        response.raise_for_status()
        
        return response.json().get("value", [])
    
    def collect_files_recursively(self, item_json: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Recursively collect all files from a folder structure"""
        results = []
        
        def _walk(item: Dict[str, Any]):
            if "file" in item:
                results.append({
                    "id": item.get("id"),
                    "name": item.get("name"),
                    "etag": item.get("eTag", "")[:32],
                    "size": item.get("size"),
                    "lastModifiedDateTime": item.get("lastModifiedDateTime"),
                    "downloadUrl": item.get("@microsoft.graph.downloadUrl"),
                })
            elif "folder" in item:
                drive_id = item.get("parentReference", {}).get("driveId")
                item_id = item.get("id")
                if drive_id and item_id:
                    children = self.list_children(drive_id, item_id)
                    for child in children:
                        _walk(child)
        
        _walk(item_json)
        return results
    
    def download_file(self, download_url: str) -> bytes:
        """Download file content from SharePoint"""
        response = requests.get(download_url)
        response.raise_for_status()
        return response.content