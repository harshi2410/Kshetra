import os
import sys
import time
from pathlib import Path
from fastapi.testclient import TestClient

# Add backend directory to sys.path
backend_dir = Path(__file__).resolve().parent.parent.parent
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

from app.main import app

client = TestClient(app)

def test_async_ai_pipeline_endpoint():
    # 1. Create a project
    proj_payload = {
        "name": "Phase 2 AI Pipeline Test Township",
        "developer": "LandOS AI Engineering Labs",
        "type": "Residential",
        "landClassification": "N.A. Residential",
        "state": "Maharashtra",
        "district": "Pune",
        "taluka": "Haveli",
        "cityVillage": "Wagholi",
        "pincode": "412207",
        "surveyNumbers": ["102/1A", "102/1B"],
        "grossArea": 5.0,
        "areaUnit": "Acres",
        "baseRatePerSqFt": 3500.0
    }

    create_res = client.post("/api/v1/projects", json=proj_payload)
    if create_res.status_code != 201:
        print("CREATE_PROJECT_ERROR:", create_res.status_code, create_res.text)
    assert create_res.status_code == 201
    proj_data = create_res.json()
    project_id = proj_data["id"]

    # 2. Trigger asynchronous AI run with planning constraints
    ai_run_payload = {
        "planningConstraints": {
            "targetPlotSqft": 1500.0,
            "minPlotSqft": 1000.0,
            "maxPlotSqft": 3000.0,
            "roadWidthFt": 40.0,
            "setbackFt": 15.0,
            "gardenPercentage": 12.0
        }
    }

    trigger_res = client.post(f"/api/v1/projects/{project_id}/ai-runs", json=ai_run_payload)
    assert trigger_res.status_code == 202
    run_info = trigger_res.json()
    assert run_info["runId"] is not None
    assert run_info["status"] in ["QUEUED", "PROCESSING", "COMPLETED"]
    run_id = run_info["runId"]

    # 3. Poll AI run status
    status_res = client.get(f"/api/v1/projects/{project_id}/ai-runs/{run_id}")
    assert status_res.status_code == 200
    status_data = status_res.json()
    assert status_data["runId"] == run_id
    assert status_data["projectId"] == project_id

    # 4. Fetch structured result
    result_res = client.get(f"/api/v1/projects/{project_id}/ai-runs/{run_id}/result")
    assert result_res.status_code == 200
    res_data = result_res.json()
    assert "land" in res_data
    assert "features" in res_data
    assert "layouts" in res_data
    assert "validation" in res_data

    # Clean up project
    del_res = client.delete(f"/api/v1/projects/{project_id}")
    assert del_res.status_code == 204
