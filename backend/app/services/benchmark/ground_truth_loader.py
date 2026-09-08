import json
import hashlib
from pathlib import Path
from typing import Dict, Any, Tuple
import logging

logger = logging.getLogger(__name__)

class GroundTruthLoader:
    def __init__(self, root_dir: Path = None):
        if not root_dir:
            self.root_dir = Path(__file__).resolve().parent.parent.parent.parent.parent / "storage" / "ground_truth"
        else:
            self.root_dir = root_dir

    def _compute_file_sha256(self, file_path: Path) -> str:
        sha256_hash = hashlib.sha256()
        with open(file_path, "rb") as f:
            for byte_block in iter(lambda: f.read(4096), b""):
                sha256_hash.update(byte_block)
        return sha256_hash.hexdigest()

    def load_ground_truth(self, project_id: str, version: str = "latest") -> Tuple[Dict[str, Any], Dict[str, Any]]:
        project_dir = self.root_dir / project_id
        if not project_dir.exists():
            raise ValueError(f"Ground Truth for project '{project_id}' not found.")
        
        target_version_dir = None
        if version == "latest":
            versions = [d.name for d in project_dir.iterdir() if d.is_dir() and d.name.startswith("v")]
            if not versions:
                raise ValueError(f"No versions found for project '{project_id}'.")
            
            versions.sort(key=lambda x: int(x[1:]))
            target_version_dir = project_dir / versions[-1]
        else:
            target_version_dir = project_dir / version
            if not target_version_dir.exists():
                raise ValueError(f"Ground Truth version '{version}' for project '{project_id}' not found.")
        
        manifest_path = target_version_dir / "manifest.json"
        if not manifest_path.exists():
            raise ValueError(f"Manifest file missing in {target_version_dir}")
        
        manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
        hashes = manifest.get("hashes", {})
        
        for rel_path, expected_hash in hashes.items():
            abs_path = target_version_dir / rel_path
            if not abs_path.exists():
                raise ValueError(f"Missing file declared in manifest: {rel_path}")
            
            actual_hash = self._compute_file_sha256(abs_path)
            if actual_hash != expected_hash:
                raise ValueError(f"Hash mismatch for {rel_path}: expected {expected_hash}, got {actual_hash}")
                
        model_path = target_version_dir / "universal_layout_model.json"
        metadata_path = target_version_dir / "metadata.json"
        
        model = json.loads(model_path.read_text(encoding="utf-8"))
        metadata = json.loads(metadata_path.read_text(encoding="utf-8"))
        
        return model, metadata

ground_truth_loader_instance = GroundTruthLoader()
