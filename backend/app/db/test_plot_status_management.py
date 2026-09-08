import urllib.request
import urllib.error
import json
import os

def run_plot_status_management_tests():
    print("==================================================")
    print("RUNNING P3.0 TASK-028 PLOT STATUS MANAGEMENT & RESERVATION TEST SUITE")
    print("==================================================")

    # 1. Fetch existing project ID
    req = urllib.request.Request('http://127.0.0.1:8000/api/v1/projects')
    with urllib.request.urlopen(req) as resp:
        projects = json.loads(resp.read().decode())
        project_id = projects[0]['id']

    print(f"[1] Target Project ID: {project_id}")

    # Helper to upload file
    def upload_file(file_bytes: bytes, filename: str) -> str:
        pdf_path = filename
        with open(pdf_path, 'wb') as f:
            f.write(file_bytes)

        boundary = '----WebKitFormBoundaryPlotStatus888'
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

    # 2. Upload vector PDF & run full pipeline (0% -> 100%)
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
    l_id = upload_file(pdf_bytes, 'plot_status_test.pdf')
    print(f"[2] Uploaded Layout PDF: ID = {l_id}")

    # Process pipeline
    process_req = urllib.request.Request(f'http://127.0.0.1:8000/api/v1/projects/{project_id}/layouts/{l_id}/process', data=b'', method='POST')
    with urllib.request.urlopen(process_req) as resp:
        proc_res = json.loads(resp.read().decode())
        print(f"[3] Full Pipeline Execution (100%): Status = {proc_res['status']} | Stage = {proc_res['stage']}")
        assert proc_res['status'] == 'COMPLETED'

    # 3. Fetch persisted plots
    plots_req = urllib.request.Request(f'http://127.0.0.1:8000/api/v1/projects/{project_id}/plots')
    with urllib.request.urlopen(plots_req) as resp:
        plots = json.loads(resp.read().decode())
        print(f"[4] Persisted Plots in DB: Count = {len(plots)}")
        assert len(plots) >= 1

    target_plot = plots[0]
    plot_id = target_plot['id']
    print(f"[5] Target Plot Selected: ID = {plot_id} | Initial Status = {target_plot['status']}")
    
    # Reset status to AVAILABLE to guarantee clean test baseline
    if target_plot['status'] != 'AVAILABLE':
        reset_req = urllib.request.Request(
            f'http://127.0.0.1:8000/api/v1/projects/{project_id}/plots/{plot_id}',
            data=json.dumps({"status": "AVAILABLE"}).encode('utf-8'),
            headers={'Content-Type': 'application/json'},
            method='PATCH'
        )
        with urllib.request.urlopen(reset_req) as resp:
            target_plot = json.loads(resp.read().decode())
            print(f"    Reset Target Plot Status to AVAILABLE: Status = {target_plot['status']}")


    # 4. TEST VALID STATUS TRANSITION: AVAILABLE -> RESERVED
    patch_payload_1 = {
        "status": "RESERVED",
        "notes": "Token amount received Rs 50,000",
        "customerId": "cust-uuid-101",
        "reservationDate": "2026-08-03T18:00:00Z"
    }
    patch_data_1 = json.dumps(patch_payload_1).encode('utf-8')
    patch_req_1 = urllib.request.Request(
        f'http://127.0.0.1:8000/api/v1/projects/{project_id}/plots/{plot_id}',
        data=patch_data_1,
        headers={'Content-Type': 'application/json'},
        method='PATCH'
    )
    with urllib.request.urlopen(patch_req_1) as resp:
        p1_res = json.loads(resp.read().decode())
        print(f"[6] Status Update AVAILABLE -> RESERVED PASSED:")
        print(f"    Status = {p1_res['status']}")
        print(f"    Notes = {p1_res['notes']}")
        print(f"    Customer ID = {p1_res['customerId']}")
        print(f"    Updated At = {p1_res['updatedAt']}")
        assert p1_res['status'] == 'RESERVED'
        assert p1_res['notes'] == "Token amount received Rs 50,000"
        assert p1_res['customerId'] == "cust-uuid-101"

    # 5. TEST VALID STATUS TRANSITION: RESERVED -> SOLD
    patch_payload_2 = {"status": "SOLD"}
    patch_data_2 = json.dumps(patch_payload_2).encode('utf-8')
    patch_req_2 = urllib.request.Request(
        f'http://127.0.0.1:8000/api/v1/projects/{project_id}/plots/{plot_id}',
        data=patch_data_2,
        headers={'Content-Type': 'application/json'},
        method='PATCH'
    )
    with urllib.request.urlopen(patch_req_2) as resp:
        p2_res = json.loads(resp.read().decode())
        print(f"[7] Status Update RESERVED -> SOLD PASSED: Status = {p2_res['status']}")
        assert p2_res['status'] == 'SOLD'

    # 6. TEST INVALID STATUS TRANSITION REJECTION (HTTP 400)
    print(f"[8] Testing Invalid Status Transition Rejection...")
    bad_payload = {"status": "INVALID_STATUS_NAME"}
    bad_data = json.dumps(bad_payload).encode('utf-8')
    bad_req = urllib.request.Request(
        f'http://127.0.0.1:8000/api/v1/projects/{project_id}/plots/{plot_id}',
        data=bad_data,
        headers={'Content-Type': 'application/json'},
        method='PATCH'
    )
    try:
        with urllib.request.urlopen(bad_req) as resp:
            print("ERROR: Invalid status did not trigger HTTP 400!")
            assert False
    except urllib.error.HTTPError as e:
        print(f"    Expected HTTP Error standard response: Code {e.code}")
        assert e.code == 400

    # 7. TEST MISSING PLOT HANDLING (HTTP 404)
    print(f"[9] Testing Missing Plot Rejection...")
    missing_req = urllib.request.Request(
        f'http://127.0.0.1:8000/api/v1/projects/{project_id}/plots/non-existent-plot-id-9999',
        data=json.dumps({"status": "RESERVED"}).encode('utf-8'),
        headers={'Content-Type': 'application/json'},
        method='PATCH'
    )
    try:
        with urllib.request.urlopen(missing_req) as resp:
            print("ERROR: Missing plot did not trigger HTTP 404!")
            assert False
    except urllib.error.HTTPError as e:
        print(f"    Expected HTTP Error standard response: Code {e.code}")
        assert e.code == 404

    # 8. VERIFY GEOMETRY PRESERVATION & PERSISTENCE IN POSTGRESQL DB
    with urllib.request.urlopen(plots_req) as resp:
        plots_final = json.loads(resp.read().decode())
        updated_plot = [p for p in plots_final if p['id'] == plot_id][0]
        print(f"[10] Final PostgreSQL DB Verification:")
        print(f"     Status = {updated_plot['status']}")
        print(f"     Polygon GeoJSON Preserved = {updated_plot['polygonGeojson'][:35]}...")
        print(f"     Calculated Area Preserved = {updated_plot['calculatedAreaSqFt']} sqft")
        assert updated_plot['status'] == 'SOLD'
        assert updated_plot['polygonGeojson'] is not None
        assert updated_plot['calculatedAreaSqFt'] > 0.0

    print("==================================================")
    print("ALL TASK-028 PLOT STATUS MANAGEMENT & RESERVATION TESTS PASSED SUCCESSFULLY!")
    print("==================================================")

if __name__ == "__main__":
    run_plot_status_management_tests()
