import urllib.request
import urllib.error
import json
import os

def run_plot_persister_tests():
    print("==================================================")
    print("RUNNING P3.0 PLOT PERSISTER & IDEMPOTENCY TEST SUITE")
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

        boundary = '----WebKitFormBoundaryPlotPersist606'
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

    # 2. Test Pipeline Execution (0% -> 100% COMPLETED)
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
    l1_id = upload_file(pdf_bytes, 'plot_persist_test.pdf')
    print(f"[2] Uploaded Blueprint Vector PDF: ID = {l1_id}")

    # Trigger Single-Trigger Full Pipeline via POST /projects/{id}/layouts/{l1_id}/process
    process_req = urllib.request.Request(f'http://127.0.0.1:8000/api/v1/projects/{project_id}/layouts/{l1_id}/process', data=b'', method='POST')
    with urllib.request.urlopen(process_req) as resp:
        process_res = json.loads(resp.read().decode())
        print(f"[3] Full Pipeline Execution Completed (100%):")
        print(f"    Status = {process_res['status']} | Stage = {process_res['stage']} | Progress = {process_res['progressPercentage']}%")
        assert process_res["status"] == "COMPLETED"
        assert process_res["stage"] == "PERSISTENCE"
        assert process_res["progressPercentage"] == 100

    # 3. Fetch persisted plots via GET /projects/{project_id}/plots
    plots_req = urllib.request.Request(f'http://127.0.0.1:8000/api/v1/projects/{project_id}/plots')
    with urllib.request.urlopen(plots_req) as resp:
        plots = json.loads(resp.read().decode())
        print(f"[4] PostgreSQL project_plots Database Verification:")
        print(f"    Total Plots Persisted in DB: {len(plots)}")
        assert len(plots) >= 3

        sample_plot = plots[0]
        print(f"    Sample Plot Record:")
        print(f"      ID: {sample_plot.get('id')}")
        print(f"      Plot Number: {sample_plot.get('plotNumber')}")
        print(f"      Area: {sample_plot.get('calculatedAreaSqFt')} sqft")
        print(f"      Facing: {sample_plot.get('facingDirection')}")
        print(f"      Centroid: ({sample_plot.get('centroidX')}, {sample_plot.get('centroidY')})")
        print(f"      Status: {sample_plot.get('status')}")

        assert sample_plot.get("plotNumber") is not None
        assert sample_plot.get("status") == "AVAILABLE"
        assert sample_plot.get("calculatedAreaSqFt") > 0.0

    # 4. IDEMPOTENCY TEST: Re-run pipeline on the same layout source
    print(f"[5] Idempotency Verification — Re-running pipeline process...")
    process_req2 = urllib.request.Request(f'http://127.0.0.1:8000/api/v1/projects/{project_id}/layouts/{l1_id}/process', data=b'', method='POST')
    with urllib.request.urlopen(process_req2) as resp:
        process_res2 = json.loads(resp.read().decode())
        assert process_res2["status"] == "COMPLETED"

    # Re-fetch plots from DB
    with urllib.request.urlopen(plots_req) as resp:
        plots_after = json.loads(resp.read().decode())
        print(f"    Plots Count Before Re-run: {len(plots)} | Plots Count After Re-run: {len(plots_after)}")
        assert len(plots_after) == len(plots)

    print("==================================================")
    print("ALL P3.0 PLOT PERSISTER & IDEMPOTENCY TESTS PASSED SUCCESSFULLY!")
    print("==================================================")

if __name__ == "__main__":
    run_plot_persister_tests()
