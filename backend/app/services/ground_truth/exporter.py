import os
import shutil
import zipfile
import logging
from pathlib import Path
from typing import Dict, Any, Optional, Tuple
from app.services.ground_truth.version_manager import GroundTruthVersionManager

logger = logging.getLogger(__name__)

class GroundTruthExporter:
    """
    Ground Truth Exporter Service (TASK-058)
    Bundles Ground Truth datasets into downloadable `.zip` archives or JSON export payloads.
    """

    def __init__(self, base_storage_dir: Optional[str] = None):
        if base_storage_dir:
            self.base_dir = Path(base_storage_dir)
        else:
            root_dir = Path(__file__).resolve().parent.parent.parent.parent.parent
            self.base_dir = root_dir / "storage" / "ground_truth"
        self.export_dir = self.base_dir.parent / "exports"
        self.export_dir.mkdir(parents=True, exist_ok=True)
        self.version_manager = GroundTruthVersionManager(base_storage_dir=str(self.base_dir))

    def create_zip_archive(self, project_id: str, version_str: str = "latest") -> Tuple[Path, str]:
        versions = self.version_manager.list_project_versions(project_id)
        if not versions:
            raise FileNotFoundError(f"No Ground Truth versions found for project '{project_id}'.")

        target_version = versions[-1] if version_str == "latest" else version_str
        version_dir = self.base_dir / project_id / target_version
        if not version_dir.exists():
            raise FileNotFoundError(f"Ground Truth version '{target_version}' not found for project '{project_id}'.")

        zip_filename = f"ground_truth_{project_id}_{target_version}.zip"
        zip_path = self.export_dir / zip_filename

        with zipfile.ZipFile(zip_path, "w", zipfile.ZIP_DEFLATED) as zf:
            for root, dirs, files in os.walk(version_dir):
                for file in files:
                    abs_file = Path(root) / file
                    arcname = abs_file.relative_to(version_dir)
                    zf.write(abs_file, arcname=str(arcname))

        logger.info(f"GroundTruthExporter: Created ZIP archive for '{project_id}' ({target_version}) at {zip_path}")
        return zip_path, zip_filename

ground_truth_exporter_instance = GroundTruthExporter()
