import urllib.request
import urllib.error
import json
import os

def run_geometry_normalizer_tests():
    print("==================================================")
    print("RUNNING P2.6.3 GEOMETRY NORMALIZER TEST SUITE")
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

        boundary = '----WebKitFormBoundaryNormTest303'
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

    # 2. Test 1: Upload Vector PDF with duplicates, connected segments, and near-closed polygon
    pdf_bytes = (
        b'%PDF-1.4\n'
        b'1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n'
        b'2 0 obj<</Type/Pages/Count 1/Kids[3 0 R]>>endobj\n'
        b'3 0 obj<</Type/Page/MediaBox[0 0 612 792]/Contents 4 0 R>>endobj\n'
        b'4 0 obj<</Length 210>>stream\n'
        b'10 10 100 100 re S\n'
        b'50 50 m 100 50 l S\n'
        b'100 50 m 50 50 l S\n'
        b'10 200 m 10 300 l 100 300 l 100 200 l 10 201.5 l S\n'
        b'endstream\nendobj\n'
        b'xref\n0 5\n0000000000 65535 f\n0000000009 00000 n\n0000000052 00000 n\n0000000101 00000 n\n0000000167 00000 n\n'
        b'trailer<</Size 5/Root 1 0 R>>\nstartxref\n356\n%%EOF\n'
    )
    l1_id = upload_file(pdf_bytes, 'normalizer_test.pdf')
    print(f"[2] Uploaded Test Vector PDF Layout: ID = {l1_id}")

    # Trigger Stage 1 Inspection
    inspect_req = urllib.request.Request(f'http://127.0.0.1:8000/api/v1/projects/{project_id}/layouts/{l1_id}/inspect', data=b'', method='POST')
    with urllib.request.urlopen(inspect_req): pass

    # Trigger Stage 2 Vector Extractor
    vec_req = urllib.request.Request(f'http://127.0.0.1:8000/api/v1/projects/{project_id}/layouts/{l1_id}/extract-vectors', data=b'', method='POST')
    with urllib.request.urlopen(vec_req): pass

    # Trigger Stage 3 Geometry Normalizer via POST /projects/{id}/layouts/{l1_id}/normalize-geometry
    norm_req = urllib.request.Request(f'http://127.0.0.1:8000/api/v1/projects/{project_id}/layouts/{l1_id}/normalize-geometry', data=b'', method='POST')
    with urllib.request.urlopen(norm_req) as resp:
        norm_res = json.loads(resp.read().decode())
        print(f"[3] Geometry Normalization Stage Completed: Status = {norm_res['status']} | Stage = {norm_res['stage']} | Progress = {norm_res['progress']}%")
        stats = norm_res["statistics"]
        print(f"    Raw Primitives: {stats['rawPrimitivesCount']} -> Normalized: {stats['normalizedPrimitivesCount']}")
        print(f"    Duplicate Removals: {stats['duplicateRemovals']} | Repaired Polygons: {stats['repairedPolygons']}")
        assert norm_res["status"] == "PROCESSING"
        assert norm_res["stage"] == "NORMALIZATION"
        assert norm_res["progress"] == 75
        assert stats["duplicateRemovals"] >= 1
        assert stats["repairedPolygons"] >= 1

    # 3. Test Error Handling — Triggering Normalization on Layout without RAW_VECTOR_PRIMITIVES
    empty_pdf_bytes = (
        b'%PDF-1.4\n'
        b'1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n'
        b'2 0 obj<</Type/Pages/Count 1/Kids[3 0 R]>>endobj\n'
        b'3 0 obj<</Type/Page/MediaBox[0 0 612 792]/Contents 4 0 R>>endobj\n'
        b'4 0 obj<</Length 15>>stream\n'
        b'BT /F1 12 Tf ET\n'
        b'endstream\nendobj\n'
        b'xref\n0 5\n0000000000 65535 f\n0000000009 00000 n\n0000000052 00000 n\n0000000101 00000 n\n0000000167 00000 n\n'
        b'trailer<</Size 5/Root 1 0 R>>\nstartxref\n230\n%%EOF\n'
    )
    l2_id = upload_file(empty_pdf_bytes, 'empty_normalizer_test.pdf')
    inspect_req2 = urllib.request.Request(f'http://127.0.0.1:8000/api/v1/projects/{project_id}/layouts/{l2_id}/inspect', data=b'', method='POST')
    with urllib.request.urlopen(inspect_req2): pass

    bad_norm_req = urllib.request.Request(f'http://127.0.0.1:8000/api/v1/projects/{project_id}/layouts/{l2_id}/normalize-geometry', data=b'', method='POST')
    try:
        urllib.request.urlopen(bad_norm_req)
        assert False, "Expected 500 error due to missing RAW_VECTOR_PRIMITIVES artifact"
    except urllib.error.HTTPError as err:
        print(f"[4] Missing RAW_VECTOR_PRIMITIVES Error Handling verified: HTTP {err.code}")
        assert err.code == 500

    # 4. Verify NORMALIZED_VECTOR_PRIMITIVES Artifact Persistence in PostgreSQL
    artifacts_req = urllib.request.Request(f'http://127.0.0.1:8000/api/v1/projects/{project_id}/layouts/{l1_id}/artifacts')
    with urllib.request.urlopen(artifacts_req) as resp:
        artifacts = json.loads(resp.read().decode())
        norm_artifacts = [a for a in artifacts if a['artifactType'] == 'NORMALIZED_VECTOR_PRIMITIVES']
        print(f"[5] GET /artifacts: Total artifacts = {len(artifacts)} | NORMALIZED_VECTOR_PRIMITIVES = {len(norm_artifacts)}")
        assert len(norm_artifacts) >= 1
        data = json.loads(norm_artifacts[0]['contentJson'])
        assert data["artifactVersion"] == "1.0.0"
        assert data["engineVersion"] == "2.6.3"
        prims = data["primitives"]
        first_prim = prims[0]
        print(f"    Normalized Primitive ID: {first_prim['id']} | Type: {first_prim['primitiveType']}")
        print(f"    Bounding Box: {first_prim['boundingBox']}")
        print(f"    Centroid: {first_prim['centroid']} | Area: {first_prim['area']} sq units")
        assert "centroid" in first_prim
        assert "orientation" in first_prim
        assert "aspectRatio" in first_prim

    print("==================================================")
    print("PASSED ALL P2.6.3 GEOMETRY NORMALIZER TESTS!")
    print("==================================================")

if __name__ == "__main__":
    run_geometry_normalizer_tests()
