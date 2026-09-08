import urllib.request
import urllib.error
import json
import os

def run_clm_tests():
    print("==================================================")
    print("RUNNING P2.5 CANONICAL LAYOUT MODEL (CLM) TEST SUITE")
    print("==================================================")

    # 1. Fetch existing project ID
    req = urllib.request.Request('http://127.0.0.1:8000/api/v1/projects')
    with urllib.request.urlopen(req) as resp:
        projects = json.loads(resp.read().decode())
        project_id = projects[0]['id']

    print(f"[1] Target Project ID: {project_id}")

    # 2. Upload dummy blueprint PDF
    pdf_path = 'clm_test_blueprint.pdf'
    with open(pdf_path, 'wb') as f:
        f.write(b'%PDF-1.4 /Type /Page /Font /FontName /DeviceRGB CLM testing PDF binary data')

    boundary = '----WebKitFormBoundaryCLMTest789'
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
        print(f"[2] Uploaded Layout: ID = {layout_id}")

    # 3. Trigger FileInspector + CLM Initialization via POST /projects/{id}/layouts/{layout_id}/inspect
    inspect_req = urllib.request.Request(
        f'http://127.0.0.1:8000/api/v1/projects/{project_id}/layouts/{layout_id}/inspect',
        data=b'',
        method='POST'
    )
    with urllib.request.urlopen(inspect_req) as resp:
        job_res = json.loads(resp.read().decode())
        print(f"[3] Inspection Stage Completed: Status = {job_res['status']} | Stage = {job_res['stage']}")
        print(f"    Result Summary: {job_res['resultSummary']}")

    # 4. Fetch Latest CLM Artifact via GET /projects/{id}/layouts/{layout_id}/clm
    clm_req = urllib.request.Request(f'http://127.0.0.1:8000/api/v1/projects/{project_id}/layouts/{layout_id}/clm')
    with urllib.request.urlopen(clm_req) as resp:
        clm_artifact = json.loads(resp.read().decode())
        print(f"[4] GET /clm Artifact Retrieved: ID = {clm_artifact['id']} | Type = {clm_artifact['artifactType']}")

        # Parse CLM JSON content
        clm_data = json.loads(clm_artifact['contentJson'])
        print(f"    CLM Version: {clm_data['version']}")
        print(f"    CLM Format: {clm_data['sourceMetadata']['format']}")
        print(f"    CLM Recommended Parser: {clm_data['sourceMetadata']['recommendedParser']}")

    # Clean up local temp test file
    if os.path.exists(pdf_path):
        os.remove(pdf_path)

    print("==================================================")
    print("PASSED ALL P2.5 CANONICAL LAYOUT MODEL (CLM) TESTS!")
    print("==================================================")

if __name__ == "__main__":
    run_clm_tests()
