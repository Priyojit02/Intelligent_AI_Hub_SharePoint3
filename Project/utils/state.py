# state.py
from typing import Dict, Optional, Any
import threading


class ApplicationState:
    """Thread-safe application state management"""
    
    def __init__(self):
        self._lock = threading.RLock()
        self._loaded_hubs: Dict[str, Dict] = {}
        # Cache structure: {hub_name: {"qa": Any, "vectorstore": Any, "loaded_at": datetime}}
    
    def set_hub(self, hub_name: str, qa: Any, vectorstore: Any):
        """Load a hub into memory"""
        from datetime import datetime
        with self._lock:
            self._loaded_hubs[hub_name] = {
                "qa": qa,
                "vectorstore": vectorstore,
                "loaded_at": datetime.utcnow()
            }
    
    def get_hub(self, hub_name: str) -> Optional[Dict]:
        """Retrieve loaded hub"""
        with self._lock:
            return self._loaded_hubs.get(hub_name)
    
    def remove_hub(self, hub_name: str):
        """Unload hub from memory"""
        with self._lock:
            if hub_name in self._loaded_hubs:
                del self._loaded_hubs[hub_name]
    
    def list_loaded_hubs(self) -> list:
        """Get list of currently loaded hubs"""
        with self._lock:
            return list(self._loaded_hubs.keys())
    
    def clear_all(self):
        """Clear all loaded hubs"""
        with self._lock:
            self._loaded_hubs.clear()


# Global state instance
app_state = ApplicationState()