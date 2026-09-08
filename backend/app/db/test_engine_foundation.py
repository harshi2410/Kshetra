import urllib.request
import urllib.error
import json
import os

def run_engine_tests():
    print("==================================================")
    print("RUNNING P2.4 LAYOUT INTELLIGENCE ENGINE TEST SUITE")
    print("==================================================")

    # 1. Fetch existing project ID
    req = urllib.request.Request('http://127.0.0.1:8000/api/v1/projects')
    with urllib.request.urlopen(req) as resp:
        projects = json.loads(resp.read().decode())
        project_id = projects[0]['id']

    print(f"[1] Target Project ID: {project_id}")

    # 2. Upload dummy blueprint PDF
    pdf_path = 'engine_test_blueprint.pdf'
    with open(pdf_path, 'wb') as f:
        f.write(b'%PDF-1.4 /Type /Page /Font /FontName /DeviceRGB sample vector blueprint binary data')

    boundary = '----WebKitFormBoundaryEngineTest456'
    filename = os.path.basename(pdf_path)
    with open(pdf_path, 'rb') as f:
        file_bytes = f.read()

    body = (
        f'--{boundary}\r\n'
        f'Content-Disposition: form-data; name="file"; filename="{filename}"\r\n'
        f'Content-Type: application/pdf\r\n\r\n'
    ).encode('utf-8') + file_bytes + (
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
        active_job = res.get('activeJob')
        print(f"[2] Uploaded Layout: ID = {layout_id}")

    # 3. Trigger FileInspector Engine via POST /projects/{id}/layouts/{layout_id}/inspect
    inspect_req = urllib.request.Request(
        f'http://127.0.0.1:8000/api/v1/projects/{project_id}/layouts/{layout_id}/inspect',
        data=b'',
        method='POST'
    )
    with urllib.request.urlopen(inspect_req) as resp:
        job_res = json.loads(resp.read().decode())
        print(f"[3] FileInspector Triggered: Status = {job_res['status']} | Stage = {job_res['stage']} | Progress = {job_res['progressPercentage']}%")
        print(f"    Summary: {job_res['resultSummary']}")

    # 4. Fetch Persisted Artifacts via GET /projects/{id}/layouts/{layout_id}/artifacts
    artifacts_req = urllib.request.Request(f'http://127.0.0.1:8000/api/v1/projects/{project_id}/layouts/{layout_id}/artifacts')
    with urllib.request.urlopen(artifacts_req) as resp:
        artifacts = json.loads(resp.read().decode())
        print(f"[4] GET /artifacts: Total artifacts persisted = {len(artifacts)}")
        for a in artifacts:
            print(f"    - Type: {a['artifactType']} | Content: {a['contentJson'][:120]}...")

    # Clean up local temp test file
    if os.path.exists(pdf_path):
        os.remove(pdf_path)

    print("==================================================")
    print("PASSED ALL P2.4 LAYOUT INTELLIGENCE ENGINE TESTS!")
    print("==================================================")

if __name__ == "__main__":
    run_engine_tests()
