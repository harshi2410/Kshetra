import json
import logging
from pathlib import Path
from typing import List, Dict, Any, Optional
from app.services.ground_truth.schemas import GroundTruthMetadata, GroundTruthManifest, GroundTruthVersionSummary

logger = logging.getLogger(__name__)

class GroundTruthVersionManager:
    """
    Manages sequential, immutable Ground Truth versioning (`v1`, `v2`, `v3`...) under `storage/ground_truth/`.
    """

    def __init__(self, base_storage_dir: Optional[str] = None):
        if base_storage_dir:
            self.base_dir = Path(base_storage_dir)
        else:
            root_dir = Path(__file__).resolve().parent.parent.parent.parent.parent
            self.base_dir = root_dir / "storage" / "ground_truth"

    def list_project_versions(self, project_id: str) -> List[str]:
        project_dir = self.base_dir / project_id
        if not project_dir.exists() or not project_dir.is_dir():
            return []
        versions = []
        for child in project_dir.iterdir():
            if child.is_dir() and child.name.startswith("v") and child.name[1:].isdigit():
                versions.append(child.name)
        versions.sort(key=lambda v: int(v[1:]))
        return versions

    def get_next_version(self, project_id: str) -> str:
        existing = self.list_project_versions(project_id)
        if not existing:
            return "v1"
        last_idx = max(int(v[1:]) for v in existing)
        return f"v{last_idx + 1}"

    def get_version_details(self, project_id: str, version_str: str) -> Optional[Dict[str, Any]]:
        version_dir = self.base_dir / project_id / version_str
        if not version_dir.exists():
            return None

        meta_path = version_dir / "metadata.json"
        manifest_path = version_dir / "manifest.json"
        ctx_path = version_dir / "processing_context.json"
        model_path = version_dir / "universal_layout_model.json"

        meta_dict = json.loads(meta_path.read_text(encoding="utf-8")) if meta_path.exists() else {}
        manifest_dict = json.loads(manifest_path.read_text(encoding="utf-8")) if manifest_path.exists() else {}
        ctx_dict = json.loads(ctx_path.read_text(encoding="utf-8")) if ctx_path.exists() else {}
        model_dict = json.loads(model_path.read_text(encoding="utf-8")) if model_path.exists() else {}

        return {
            "projectId": project_id,
            "version": version_str,
            "metadata": meta_dict,
            "manifest": manifest_dict,
            "processingContext": ctx_dict,
            "universalLayoutModel": model_dict,
            "directoryPath": str(version_dir)
        }

    def get_version_summaries(self, project_id: str) -> List[GroundTruthVersionSummary]:
        versions = self.list_project_versions(project_id)
        if not versions:
            return []
        latest_version = versions[-1]
        summaries = []

        for v in versions:
            details = self.get_version_details(project_id, v)
            if not details:
                continue
            meta = details.get("metadata", {})
            summaries.append(GroundTruthVersionSummary(
                version=v,
                approvalDate=meta.get("approval_date", ""),
                approvedBy=meta.get("approved_by", "Chief Architect"),
                plotCount=meta.get("plot_count", 0),
                roadCount=meta.get("road_count", 0),
                boundaryArea=meta.get("boundary_area", 0.0),
                geometryHash=meta.get("geometry_hash", ""),
                imageHash=meta.get("image_hash", ""),
                isLatest=(v == latest_version)
            ))
        return summaries

ground_truth_version_manager_instance = GroundTruthVersionManager()
