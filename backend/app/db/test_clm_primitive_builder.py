import urllib.request
import urllib.error
import json
import os

def run_clm_primitive_builder_tests():
    print("==================================================")
    print("RUNNING P2.6.4 CLM PRIMITIVE BUILDER TEST SUITE")
    print("==================================================")

    # 1. Fetch existing project ID
    req = urllib.request.Request('http://127.0.0.1:8000/api/v1/projects')
    with urllib.request.urlopen(req) as resp:
        projects = json.loads(resp.read().decode())
        project_id = projects[0]['id']

    print(f"[1] Target Project ID: {project_id}")

    # Helper function to upload file
    def upload_file(file_bytes: bytes, filename: str) -> str:
        pdf_path = filename
        with open(pdf_path, 'wb') as f:
            f.write(file_bytes)

        boundary = '----WebKitFormBoundaryCLMTest404'
        with open(pdf_path, 'rb') as f:
            b_data = f.read()

        body = (
            f'--{boundary}\r\n'
            f'Content-Disposition: form-data; name="file"; filename="{filename}"\r\n'
            f'Content-Type: application/pdf\r\n\r\n'
        ).encode('utf-8') + b_data + (
            f'\r\n--{boundary}\r\n'
            f'Content-Disposition: form-data; name="scale_ratio"\r\n\r\n'
            f'1:500\r\n'
            f'--{boundary}--\r\n'
        ).encode('utf-8')

        upload_req = urllib.request.Request(
            f'http://127.0.0.1:8000/api/v1/projects/{project_id}/layouts',
            data=body,
            headers={'Content-Type': f'multipart/form-data; boundary={boundary}'},
            method='POST'
        )

        with urllib.request.urlopen(upload_req) as resp:
            res = json.loads(resp.read().decode())
            layout_id = res['id']

        if os.path.exists(pdf_path):
            os.remove(pdf_path)
        return layout_id

    # 2. Test Single-Trigger Auto-Run Pipeline: Upload PDF with boundary, plots, and roads
    pdf_bytes = (
        b'%PDF-1.4\n'
        b'1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n'
        b'2 0 obj<</Type/Pages/Count 1/Kids[3 0 R]>>endobj\n'
        b'3 0 obj<</Type/Page/MediaBox[0 0 612 792]/Contents 4 0 R>>endobj\n'
        b'4 0 obj<</Length 350>>stream\n'
        b'0 0 600 780 re S\n'
        b'20 20 100 80 re S\n'
        b'130 20 100 80 re S\n'
        b'240 20 100 80 re S\n'
        b'10 120 m 590 120 l S\n'
        b'endstream\nendobj\n'
        b'xref\n0 5\n0000000000 65535 f\n0000000009 00000 n\n0000000052 00000 n\n0000000101 00000 n\n0000000167 00000 n\n'
        b'trailer<</Size 5/Root 1 0 R>>\nstartxref\n450\n%%EOF\n'
    )
    l1_id = upload_file(pdf_bytes, 'clm_auto_test.pdf')
    print(f"[2] Uploaded Blueprint Vector PDF: ID = {l1_id}")

    # Trigger Single-Trigger Full Pipeline via POST /projects/{id}/layouts/{l1_id}/process
    process_req = urllib.request.Request(f'http://127.0.0.1:8000/api/v1/projects/{project_id}/layouts/{l1_id}/process', data=b'', method='POST')
    with urllib.request.urlopen(process_req) as resp:
        process_res = json.loads(resp.read().decode())
        print(f"[3] Single-Trigger Full Pipeline Auto-Run Completed:")
        print(f"    Status = {process_res['status']} | Stage = {process_res['stage']} | Progress = {process_res['progressPercentage']}%")
        assert process_res["status"] == "PROCESSING"
        assert process_res["stage"] == "CLM_BUILD"
        assert process_res["progressPercentage"] == 85


    # Fetch CLM artifact to verify populated shape classifications
    clm_req = urllib.request.Request(f'http://127.0.0.1:8000/api/v1/projects/{project_id}/layouts/{l1_id}/clm')
    with urllib.request.urlopen(clm_req) as resp:
        clm_art = json.loads(resp.read().decode())
        clm_data = json.loads(clm_art['contentJson'])
        boundaries = clm_data.get("boundaries", [])
        closed_polys = clm_data.get("closedPolygons", [])
        roads = clm_data.get("roads", [])

        print(f"[4] CLM Artifact Verification:")
        print(f"    CLM Version: {clm_data.get('version')}")
        print(f"    Boundaries Classified: {len(boundaries)}")
        print(f"    Plots/Closed Shapes Classified: {len(closed_polys)}")
        print(f"    Road Candidates Classified: {len(roads)}")

        assert clm_data.get("version") == "1.0.0"
        assert len(boundaries) >= 1
        assert len(closed_polys) >= 3
        assert len(roads) >= 1

    # Fetch all artifacts to verify CLM_PRIMITIVES exists
    art_req = urllib.request.Request(f'http://127.0.0.1:8000/api/v1/projects/{project_id}/layouts/{l1_id}/artifacts')
    with urllib.request.urlopen(art_req) as resp:
        artifacts = json.loads(resp.read().decode())
        art_types = [a["artifactType"] for a in artifacts]
        print(f"[5] Pipeline Artifacts Persisted to PostgreSQL: {art_types}")
        assert "INSPECTION_METADATA" in art_types
        assert "CANONICAL_LAYOUT_MODEL" in art_types
        assert "RAW_VECTOR_PRIMITIVES" in art_types
        assert "NORMALIZED_VECTOR_PRIMITIVES" in art_types
        assert "CLM_PRIMITIVES" in art_types

    # 3. Test Error Handling — Triggering build-clm on layout without normalization
    unnorm_bytes = b'%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n2 0 obj<</Type/Pages/Count 1/Kids[3 0 R]>>endobj\n3 0 obj<</Type/Page/MediaBox[0 0 612 792]/Contents 4 0 R>>endobj\n4 0 obj<</Length 10>>stream\n10 10 m S\nendstream\nendobj\nxref\n0 5\n0000000000 65535 f\n0000000009 00000 n\n0000000052 00000 n\n0000000101 00000 n\n0000000167 00000 n\ntrailer<</Size 5/Root 1 0 R>>\nstartxref\n230\n%%EOF\n'
    l2_id = upload_file(unnorm_bytes, 'unnorm_test.pdf')
    print(f"[6] Testing error handling on unnormalized layout: ID = {l2_id}")
    
    build_clm_req = urllib.request.Request(f'http://127.0.0.1:8000/api/v1/projects/{project_id}/layouts/{l2_id}/build-clm', data=b'', method='POST')
    try:
        with urllib.request.urlopen(build_clm_req):
            print("ERROR: Should have raised 500 error for unnormalized layout!")
            assert False
    except urllib.error.HTTPError as e:
        print(f"[7] Caught Expected Error: HTTP {e.code}")
        assert e.code == 500

    print("==================================================")
    print("ALL P2.6.4 CLM PRIMITIVE BUILDER TESTS PASSED SUCCESSFULLY!")
    print("==================================================")

if __name__ == "__main__":
    run_clm_primitive_builder_tests()
