from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import Dict, Any, List
from pathlib import Path
import json

from app.db.session import get_db
from app.services.benchmark.benchmark_service import benchmark_service_instance
from app.services.benchmark.schemas import BenchmarkResult
from app.models.project import LayoutProcessingArtifact

router = APIRouter()

@router.get("/projects/{project_id}/benchmark/versions")
def list_ground_truth_versions(project_id: str):
    root_dir = Path(__file__).resolve().parent.parent.parent.parent.parent / "storage" / "ground_truth" / project_id
    if not root_dir.exists():
        return []
    versions = sorted([d.name for d in root_dir.iterdir() if d.is_dir() and d.name.startswith("v")], key=lambda x: int(x[1:]))
    return versions

@router.post("/projects/{project_id}/benchmark/run", response_model=BenchmarkResult)
def run_benchmark(project_id: str, db: Session = Depends(get_db)):
    # Fetch latest UNIVERSAL_LAYOUT_MODEL predicted by pipeline for this project
    art = db.query(LayoutProcessingArtifact).filter(
        LayoutProcessingArtifact.project_id == project_id,
        LayoutProcessingArtifact.artifact_type == "UNIVERSAL_LAYOUT_MODEL"
    ).order_by(LayoutProcessingArtifact.created_at.desc()).first()
    
    if not art or not art.content_json:
        raise HTTPException(status_code=404, detail="No pipeline prediction artifact found for benchmark.")
        
    predicted_model = json.loads(art.content_json)
    
    try:
        result = benchmark_service_instance.evaluate_layout(
            project_id=project_id,
            predicted_model=predicted_model,
            pipeline_version="1.0.0",
            git_commit="HEAD"
        )
        return result
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/projects/{project_id}/benchmark/latest")
def get_latest_benchmark_report(project_id: str):
    root_dir = Path(__file__).resolve().parent.parent.parent.parent.parent / "storage" / "benchmarks" / project_id
    if not root_dir.exists():
        raise HTTPException(status_code=404, detail="No benchmarks found.")
        
    runs = sorted([d for d in root_dir.iterdir() if d.is_dir()], key=lambda x: x.stat().st_mtime, reverse=True)
    if not runs:
        raise HTTPException(status_code=404, detail="No benchmarks found.")
        
    latest_run = runs[0]
    json_path = latest_run / "benchmark_result.json"
    
    if not json_path.exists():
        raise HTTPException(status_code=404, detail="Benchmark result file missing.")
        
    return json.loads(json_path.read_text(encoding="utf-8"))

@router.get("/projects/{project_id}/benchmark")
def get_benchmark_meta(project_id: str):
    return {"status": "Active", "project_id": project_id}
