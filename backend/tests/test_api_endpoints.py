"""
Test FastAPI endpoints for Maharashtra Planning Norms & Layout Generation.
"""

import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


from app.db.base import Base
from app.db.session import engine

# Ensure tables are created in SQLite test DB
Base.metadata.create_all(bind=engine)


def test_api_planning_jurisdictions():
    response = client.get("/api/v1/planning-norms/jurisdictions")
    assert response.status_code == 200
    data = response.json()
    assert "authorities" in data
    assert len(data["authorities"]) >= 10
    auth_ids = [a["id"] for a in data["authorities"]]
    assert "IN_MH_PMC" in auth_ids


def test_api_planning_norms_evaluate():
    payload = {
        "jurisdictionId": "IN_MH_PMC",
        "landAreaSqm": 8000.0,
        "landUse": "RESIDENTIAL",
        "isCongested": False
    }
    response = client.post("/api/v1/planning-norms/evaluate", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["openSpacePercentage"] == 10.0
    assert data["amenitySpacePercentage"] == 5.0
    assert data["internalRoadWidthM"] == 9.0
    assert data["minPlotAreaSqm"] == 100.0


def test_api_generate_layouts_and_variants():
    # 1. Create a dedicated test project for test isolation
    create_payload = {
        "name": "Pune Green Enclave Test",
        "developer": "Godrej Properties",
        "type": "Residential",
        "landClassification": "N.A. Residential",
        "description": "Test plotting layout project",
        "state": "Maharashtra",
        "district": "Pune",
        "taluka": "Haveli",
        "cityVillage": "Pune",
        "pincode": "411001",
        "surveyNumbers": ["45/1A", "45/1B"],
        "grossArea": 2.0,
        "areaUnit": "Acres"
    }
    create_resp = client.post("/api/v1/projects", json=create_payload)
    assert create_resp.status_code == 201
    proj_id = create_resp.json()["id"]

    # 2. Trigger generate layouts
    gen_payload = {
        "lengthFt": 320.0,
        "breadthFt": 220.0,
        "jurisdictionId": "IN_MH_PMC",
        "cityArea": "Pune",
        "landUse": "RESIDENTIAL",
        "isCongested": False,
        "planningRegulation": "UDCPR_2020"
    }
    gen_resp = client.post(f"/api/v1/projects/{proj_id}/generate-layouts", json=gen_payload)
    assert gen_resp.status_code == 200
    gen_data = gen_resp.json()

    assert gen_data["validOptionsCount"] in [2, 3]
    assert len(gen_data["variants"]) == gen_data["validOptionsCount"]
    first_var = gen_data["variants"][0]
    assert "OPTION 1" in first_var["optionBadge"]
    assert first_var["complianceStatus"] == "PASS"

    # 3. Fetch variants list
    var_list_resp = client.get(f"/api/v1/projects/{proj_id}/variants")
    assert var_list_resp.status_code == 200
    variants = var_list_resp.json()
    assert len(variants) >= 2

    # 4. Fetch SVG for active variant (13K)
    svg_resp = client.get(f"/api/v1/projects/{proj_id}/variants/{first_var['id']}/svg")
    assert svg_resp.status_code == 200
    svg_data = svg_resp.json()
    assert "<svg" in svg_data["svgContent"]
    assert "RECREATIONAL OPEN SPACE" in svg_data["svgContent"]
    assert "GRAPHIC SCALE" in svg_data["svgContent"]

    # 5. Fetch model JSON
    model_resp = client.get(f"/api/v1/projects/{proj_id}/variants/{first_var['id']}/model")
    assert model_resp.status_code == 200
    model = model_resp.json()
    assert "plots" in model
    assert "roads" in model
    assert "amenities" in model


def test_api_boundary_detection_and_confirmation():
    # 1. Fetch or create project
    p_resp = client.get("/api/v1/projects")
    assert p_resp.status_code == 200
    projects = p_resp.json()
    assert len(projects) > 0
    proj_id = projects[0]["id"]

    # 2. Detect boundary with parameters
    detect_resp = client.post(
        f"/api/v1/projects/{proj_id}/detect-boundary",
        json={"epsilonRatio": 0.012, "detectionMode": "AUTO"}
    )
    assert detect_resp.status_code == 200
    detect_data = detect_resp.json()
    assert "polygon" in detect_data
    assert len(detect_data["polygon"]) >= 3
    assert detect_data["status"] == "DETECTED"

    # 3. Confirm boundary
    poly = detect_data["polygon"]
    confirm_resp = client.post(
        f"/api/v1/projects/{proj_id}/confirm-boundary",
        json={"polygonVertices": poly, "polygon": poly, "boundaryConfirmed": True}
    )
    assert confirm_resp.status_code == 200
    confirm_data = confirm_resp.json()
    assert confirm_data["status"] == "LOCKED"
    assert confirm_data["isLocked"] is True
    assert confirm_data["areaSqft"] > 0

    # 4. Generate 2D Layout inside confirmed boundary
    gen_resp = client.post(
        f"/api/v1/projects/{proj_id}/generate-layouts",
        json={"lengthFt": 350.0, "breadthFt": 240.0, "polygonVertices": poly}
    )
    assert gen_resp.status_code == 200
    gen_data = gen_resp.json()
    assert gen_data["validOptionsCount"] >= 1

