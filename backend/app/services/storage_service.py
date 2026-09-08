import os
import re
import uuid
import shutil
import logging
from pathlib import Path
from typing import Tuple
from fastapi import UploadFile, HTTPException, status

logger = logging.getLogger(__name__)

# Base storage directory: backend/uploads
BASE_DIR = Path(__file__).resolve().parent.parent.parent
UPLOADS_DIR = BASE_DIR / "uploads"

# Allowed MIME types & file extensions for layout blueprints
ALLOWED_EXTENSIONS = {".pdf", ".png", ".jpg", ".jpeg", ".tiff"}
ALLOWED_MIME_TYPES = {
    "application/pdf",
    "image/png",
    "image/jpeg",
    "image/jpg",
    "image/tiff"
}

MAX_FILE_SIZE_BYTES = 50 * 1024 * 1024  # 50MB maximum

class StorageService:
    """
    Service responsible for secure filesystem storage of project layout blueprint files.
    Manages project-scoped directory creation, filename sanitization, size validation,
    path traversal prevention, and filesystem cleanup upon transaction rollback.
    """

    def sanitize_filename(self, filename: str) -> str:
        """
        Sanitizes original filename to prevent path traversal attack vectors (../)
        and invalid filesystem characters.
        """
        # Extract filename basename (remove directory paths if provided)
        clean_name = os.path.basename(filename)
        # Remove any character that is not alphanumeric, hyphen, underscore, or dot
        clean_name = re.sub(r'[^a-zA-Z0-9._-]', '_', clean_name)
        return clean_name

    def validate_file(self, upload_file: UploadFile) -> str:
        """
        Validates file extension and MIME type.
        Returns the sanitized file extension.
        """
        original_filename = upload_file.filename or "unnamed_file.pdf"
        ext = os.path.splitext(original_filename)[1].lower()

        if ext not in ALLOWED_EXTENSIONS:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Unsupported file extension '{ext}'. Allowed extensions: {', '.join(sorted(ALLOWED_EXTENSIONS))}"
            )

        content_type = upload_file.content_type or ""
        if content_type and content_type not in ALLOWED_MIME_TYPES:
            # Allow fallback if content_type is octet-stream but extension is valid
            if content_type != "application/octet-stream":
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Invalid MIME type '{content_type}'. Allowed types: PDF, PNG, JPG, JPEG, TIFF"
                )

        return ext

    def save_layout_file(self, project_id: str, upload_file: UploadFile) -> Tuple[str, str, int, str]:
        """
        Saves uploaded binary file to project-scoped directory:
        backend/uploads/projects/{project_id}/layouts/{unique_file_name}

        Returns Tuple: (original_clean_filename, relative_file_path, file_size_bytes, mime_type)
        """
        ext = self.validate_file(upload_file)
        original_clean_name = self.sanitize_filename(upload_file.filename or f"layout{ext}")

        # Construct project-scoped directory path
        project_layout_dir = UPLOADS_DIR / "projects" / project_id / "layouts"
        project_layout_dir.mkdir(parents=True, exist_ok=True)

        # Generate unique storage filename to prevent overwriting existing files
        unique_prefix = f"{uuid.uuid4().hex[:8]}"
        storage_filename = f"{unique_prefix}_{original_clean_name}"
        destination_path = project_layout_dir / storage_filename

        # Stream binary file contents to disk while validating size
        bytes_written = 0
        try:
            with destination_path.open("wb") as buffer:
                # Read in 64KB chunks to optimize memory usage for large blueprints
                while chunk := upload_file.file.read(64 * 1024):
                    bytes_written += len(chunk)
                    if bytes_written > MAX_FILE_SIZE_BYTES:
                        buffer.close()
                        self.delete_file_safely(str(destination_path))
                        raise HTTPException(
                            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                            detail=f"File exceeds maximum allowed size of 50MB ({MAX_FILE_SIZE_BYTES} bytes)."
                        )
                    buffer.write(chunk)
        except Exception as e:
            if destination_path.exists():
                self.delete_file_safely(str(destination_path))
            if isinstance(e, HTTPException):
                raise e
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to write layout file to disk: {str(e)}"
            )

        # Internal relative storage path reference
        relative_path = f"uploads/projects/{project_id}/layouts/{storage_filename}"
        mime_type = upload_file.content_type or f"application/{ext.replace('.', '')}"

        logger.info(f"Successfully saved layout file to {destination_path} ({bytes_written} bytes)")
        return original_clean_name, relative_path, bytes_written, mime_type

    def delete_file_safely(self, file_path_str: str) -> None:
        """
        Safely deletes a physical file from the filesystem.
        Used during database transaction rollback to cleanup orphan binary files.
        """
        try:
            if not file_path_str:
                return

            p = Path(file_path_str)
            if not p.is_absolute():
                p = BASE_DIR / file_path_str

            if p.exists() and p.is_file():
                p.unlink()
                logger.info(f"Safely deleted orphan file: {p}")
        except Exception as e:
            logger.error(f"Error deleting file {file_path_str}: {str(e)}")

storage_service_instance = StorageService()
