import urllib.request
import urllib.error
import json
import os

def run_vector_extractor_tests():
    print("==================================================")
    print("RUNNING P2.6.2 VECTOR PATH EXTRACTOR TEST SUITE")
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

        boundary = '----WebKitFormBoundaryVectorTest202'
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

    # 2. Test 1: Simple Vector PDF with Line, Rectangle, Curve, Transformation Matrix (cm), Graphics Stack (q/Q), and Polygon
    simple_pdf_bytes = (
        b'%PDF-1.4\n'
        b'1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n'
        b'2 0 obj<</Type/Pages/Count 1/Kids[3 0 R]>>endobj\n'
        b'3 0 obj<</Type/Page/MediaBox[0 0 612 792]/Contents 4 0 R>>endobj\n'
        b'4 0 obj<</Length 180>>stream\n'
        b'q 1.5 w 0 0 1 RG 10 10 100 100 re S Q\n'
        b'q 1 0 0 1 50 50 cm 0 0 m 100 0 l S Q\n'
        b'10 200 m 50 250 100 250 150 200 c S\n'
        b'200 200 m 250 200 l 250 250 l 200 250 l h f\n'
        b'endstream\nendobj\n'
        b'xref\n0 5\n0000000000 65535 f\n0000000009 00000 n\n0000000052 00000 n\n0000000101 00000 n\n0000000167 00000 n\n'
        b'trailer<</Size 5/Root 1 0 R>>\nstartxref\n356\n%%EOF\n'
    )
    l1_id = upload_file(simple_pdf_bytes, 'simple_vector_test.pdf')
    print(f"[2] Uploaded Simple Vector PDF Layout: ID = {l1_id}")

    # Trigger Stage 1 Inspection
    inspect_req = urllib.request.Request(f'http://127.0.0.1:8000/api/v1/projects/{project_id}/layouts/{l1_id}/inspect', data=b'', method='POST')
    with urllib.request.urlopen(inspect_req) as resp:
        pass

    # Trigger Stage 2 Vector Extractor via POST /projects/{id}/layouts/{l1_id}/extract-vectors
    vec_req = urllib.request.Request(f'http://127.0.0.1:8000/api/v1/projects/{project_id}/layouts/{l1_id}/extract-vectors', data=b'', method='POST')
    with urllib.request.urlopen(vec_req) as resp:
        vec_res = json.loads(resp.read().decode())
        print(f"[3] Simple Vector Extraction Statistics: {vec_res['statistics']}")
        assert vec_res["status"] == "PROCESSING"
        assert vec_res["stage"] == "EXTRACTION"
        assert vec_res["progress"] == 60
        assert vec_res["statistics"]["totalPrimitives"] >= 4

    # 3. Test 2: Multi-Page Vector PDF
    multipage_pdf_bytes = (
        b'%PDF-1.4\n'
        b'1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n'
        b'2 0 obj<</Type/Pages/Count 2/Kids[3 0 R 4 0 R]>>endobj\n'
        b'3 0 obj<</Type/Page/MediaBox[0 0 612 792]/Contents 5 0 R>>endobj\n'
        b'4 0 obj<</Type/Page/MediaBox[0 0 612 792]/Contents 6 0 R>>endobj\n'
        b'5 0 obj<</Length 35>>stream\n'
        b'10 10 50 50 re S\n50 50 m 100 50 l S\n'
        b'endstream\nendobj\n'
        b'6 0 obj<</Length 35>>stream\n'
        b'20 20 60 60 re S\n60 60 m 120 60 l S\n'
        b'endstream\nendobj\n'
        b'xref\n0 7\n0000000000 65535 f\n0000000009 00000 n\n0000000052 00000 n\n0000000105 00000 n\n0000000171 00000 n\n0000000237 00000 n\n0000000320 00000 n\n'
        b'trailer<</Size 7/Root 1 0 R>>\nstartxref\n403\n%%EOF\n'
    )
    l2_id = upload_file(multipage_pdf_bytes, 'multipage_vector_test.pdf')
    inspect_req2 = urllib.request.Request(f'http://127.0.0.1:8000/api/v1/projects/{project_id}/layouts/{l2_id}/inspect', data=b'', method='POST')
    with urllib.request.urlopen(inspect_req2): pass
    vec_req2 = urllib.request.Request(f'http://127.0.0.1:8000/api/v1/projects/{project_id}/layouts/{l2_id}/extract-vectors', data=b'', method='POST')
    with urllib.request.urlopen(vec_req2) as resp:
        vec_res2 = json.loads(resp.read().decode())
        print(f"[4] Multi-Page Vector Extraction Statistics: {vec_res2['statistics']}")
        assert vec_res2["statistics"]["pages"] == 2
        assert vec_res2["statistics"]["totalPrimitives"] >= 4

    # 4. Test 3: Raster-Only / Empty PDF (No vector operations)
    raster_pdf_bytes = (
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
    l3_id = upload_file(raster_pdf_bytes, 'raster_only_test.pdf')
    inspect_req3 = urllib.request.Request(f'http://127.0.0.1:8000/api/v1/projects/{project_id}/layouts/{l3_id}/inspect', data=b'', method='POST')
    with urllib.request.urlopen(inspect_req3): pass
    vec_req3 = urllib.request.Request(f'http://127.0.0.1:8000/api/v1/projects/{project_id}/layouts/{l3_id}/extract-vectors', data=b'', method='POST')
    with urllib.request.urlopen(vec_req3) as resp:
        vec_res3 = json.loads(resp.read().decode())
        print(f"[5] Raster-Only Extraction Statistics: {vec_res3['statistics']}")
        assert vec_res3["statistics"]["totalPrimitives"] == 0

    # 5. Test 4: Error Handling — Missing Project / Layout
    bad_req = urllib.request.Request(f'http://127.0.0.1:8000/api/v1/projects/invalid-proj/layouts/invalid-layout/extract-vectors', data=b'', method='POST')
    try:
        urllib.request.urlopen(bad_req)
        assert False, "Expected 404 error"
    except urllib.error.HTTPError as err:
        print(f"[6] Invalid Layout Error Handling verified: HTTP {err.code}")
        assert err.code == 404

    # 6. Verify RAW_VECTOR_PRIMITIVES Artifact Persistence in PostgreSQL and Rich Primitive Fields
    artifacts_req = urllib.request.Request(f'http://127.0.0.1:8000/api/v1/projects/{project_id}/layouts/{l1_id}/artifacts')
    with urllib.request.urlopen(artifacts_req) as resp:
        artifacts = json.loads(resp.read().decode())
        vec_artifacts = [a for a in artifacts if a['artifactType'] == 'RAW_VECTOR_PRIMITIVES']
        print(f"[7] GET /artifacts: Total artifacts = {len(artifacts)} | RAW_VECTOR_PRIMITIVES = {len(vec_artifacts)}")
        assert len(vec_artifacts) >= 1
        data = json.loads(vec_artifacts[0]['contentJson'])
        assert data["artifactVersion"] == "1.0.0"
        assert data["engineVersion"] == "2.6.2"
        prims = data["primitives"]
        print(f"    Extracted Primitives Count: {len(prims)}")
        first_prim = prims[0]
        print(f"    Primitive ID: {first_prim['id']} | Type: {first_prim['primitiveType']}")
        print(f"    Rich Bounding Box: {first_prim['boundingBox']}")
        assert "width" in first_prim["boundingBox"]
        assert "height" in first_prim["boundingBox"]
        assert "area" in first_prim["boundingBox"]

    print("==================================================")
    print("PASSED ALL P2.6.2 VECTOR PATH EXTRACTOR TESTS!")
    print("==================================================")

if __name__ == "__main__":
    run_vector_extractor_tests()
