# config.py
import os
from pathlib import Path
from pydantic_settings import BaseSettings
from functools import lru_cache
from typing import Optional


class Settings(BaseSettings):
    # OpenAI Configuration
    OPENAI_API_KEY: str
    OPENAI_API_BASE: str = "https://genai-sharedservice-americas.pwcinternal.com"
    OPENAI_MODEL: str = "openai.gpt-4.1"
    OPENAI_EMBEDDING_MODEL: str = "azure.text-embedding-3-large"
    
    # SharePoint Configuration
    TENANT_ID: str
    CLIENT_ID: str
    CLIENT_SECRET: str
    
    # Application Settings
    PERSIST_DIR: str = "./persisted_data"
    CHUNK_SIZE: int = 1000
    CHUNK_OVERLAP: int = 100
    
    # Parallel Processing
    MAX_WORKERS: int = 10
    BATCH_SIZE: int = 20
    
    # QA Engine
    RETRIEVER_K: int = 6
    LLM_TEMPERATURE: float = 0.3
    
    class Config:
        # Try multiple locations for .env file
        env_file = ".env"
        env_file_encoding = 'utf-8'
        case_sensitive = True
        extra = "ignore"  # Ignore extra fields in .env


@lru_cache()
def get_settings() -> Settings:
    """Get settings with better error handling"""
    # Try to find .env file in multiple locations
    possible_env_paths = [
        Path(".env"),
        Path("../.env"),
        Path(__file__).parent / ".env",
        Path(__file__).parent.parent / ".env",
    ]
    
    env_path = None
    for path in possible_env_paths:
        if path.exists():
            env_path = path
            break
    
    if env_path:
        print(f"✓ Found .env file at: {env_path.absolute()}")
    else:
        print("⚠ Warning: .env file not found in any expected location")
        print("Expected locations:")
        for path in possible_env_paths:
            print(f"  - {path.absolute()}")
    
    try:
        return Settings(_env_file=str(env_path) if env_path else None)
    except Exception as e:
        print(f"\n❌ Error loading settings: {e}")
        print("\nPlease ensure your .env file contains:")
        print("  - OPENAI_API_KEY")
        print("  - TENANT_ID")
        print("  - CLIENT_ID")
        print("  - CLIENT_SECRET")
        raise