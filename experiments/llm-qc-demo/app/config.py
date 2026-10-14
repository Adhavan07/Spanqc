import os
from pydantic import BaseModel

class Settings(BaseModel):
    # Ollama Local Model Runtime Configuration
    ollama_host: str = os.getenv("OLLAMA_HOST", "http://localhost:11434")
    # Default open-weight vision model (Gemma 3 4B Vision, Qwen 2.5 VL, or Llama 3.2 Vision)
    ollama_model: str = os.getenv("OLLAMA_MODEL", "gemma3:4b")
    ollama_timeout_seconds: float = float(os.getenv("OLLAMA_TIMEOUT_SECONDS", "180.0"))
    ollama_num_gpu: int = int(os.getenv("OLLAMA_NUM_GPU", "0"))

    # File and Ingestion Constraints
    max_file_size_bytes: int = int(os.getenv("MAX_FILE_SIZE_BYTES", str(50 * 1024 * 1024)))  # 50MB
    render_dpi: int = int(os.getenv("RENDER_DPI", "150"))
    max_pages_to_process: int = int(os.getenv("MAX_PAGES_TO_PROCESS", "10"))

    # Service Server (default to 127.0.0.1 for local single-host safety)
    service_host: str = os.getenv("SERVICE_HOST", "127.0.0.1")
    service_port: int = int(os.getenv("SERVICE_PORT", "8000"))

    # Service-to-Service Authentication
    internal_service_secret: str = os.getenv("SPANQC_INTERNAL_SERVICE_SECRET", "")
    min_secret_length: int = int(os.getenv("MIN_SECRET_LENGTH", "16"))

    # Network, CORS & Exposure Controls
    cors_origins: str = os.getenv("CORS_ORIGINS", "")
    enable_demo_ui: bool = os.getenv("ENABLE_DEMO_UI", "false").lower() in ("true", "1", "yes")
    enable_api_docs: bool = os.getenv("ENABLE_API_DOCS", "false").lower() in ("true", "1", "yes")

    # Resource & Concurrency Controls
    max_concurrent_analysis: int = int(os.getenv("MAX_CONCURRENT_ANALYSIS", "2"))

    def is_secret_valid(self) -> bool:
        """Validates that internal secret is configured and satisfies length policy."""
        return bool(
            self.internal_service_secret
            and len(self.internal_service_secret.strip()) >= self.min_secret_length
        )

settings = Settings()
