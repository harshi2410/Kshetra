import urllib.request
import urllib.error
import json
import os

def run_job_tests():
    print("==================================================")
    print("RUNNING P2.3.2 PROCESSING JOB PIPELINE TEST SUITE")
    print("==================================================")

    # 1. Fetch existing project ID
    req = urllib.request.Request('http://127.0.0.1:8000/api/v1/projects')
    with urllib.request.urlopen(req) as resp:
        projects = json.loads(resp.read().decode())
        project_id = projects[0]['id']

    print(f"[1] Target Project ID: {project_id}")

    # 2. Upload dummy blueprint PDF
    pdf_path = 'job_test_blueprint.pdf'
    with open(pdf_path, 'wb') as f:
        f.write(b'%PDF-1.4 processing job pipeline test blueprint data bytes')

    boundary = '----WebKitFormBoundaryJobTest123'
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
        f'1:1000\r\n'
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
        print(f"[2] Upload Response: Layout ID = {layout_id}")
        print(f"    Active Job Enqueued: ID = {active_job['id']} | Status = {active_job['status']} | Stage = {active_job['stage']}")

    # 3. Test GET /projects/{project_id}/layouts
    list_req = urllib.request.Request(f'http://127.0.0.1:8000/api/v1/projects/{project_id}/layouts')
    with urllib.request.urlopen(list_req) as resp:
        layouts = json.loads(resp.read().decode())
        print(f"[3] GET /projects/{project_id}/layouts: Total layout sources = {len(layouts)}")

    # 4. Test GET /projects/{project_id}/layouts/{layout_id}/processing-status
    status_req = urllib.request.Request(f'http://127.0.0.1:8000/api/v1/projects/{project_id}/layouts/{layout_id}/processing-status')
    with urllib.request.urlopen(status_req) as resp:
        status_res = json.loads(resp.read().decode())
        print(f"[4] GET Polling Status: Job ID = {status_res['id']} | Status = {status_res['status']} | Stage = {status_res['stage']} | Progress = {status_res['progressPercentage']}%")

    # Clean up local temp test file
    if os.path.exists(pdf_path):
        os.remove(pdf_path)

    print("==================================================")
    print("PASSED ALL P2.3.2 PROCESSING JOB PIPELINE TESTS!")
    print("==================================================")

if __name__ == "__main__":
    run_job_tests()
