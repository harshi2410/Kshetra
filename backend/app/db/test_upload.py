import urllib.request
import urllib.error
import json
import os

def run_tests():
    # 1. Fetch existing project ID
    req = urllib.request.Request('http://127.0.0.1:8000/api/v1/projects')
    with urllib.request.urlopen(req) as resp:
        projects = json.loads(resp.read().decode())
        project_id = projects[0]['id']

    print('Testing Upload API for Project ID:', project_id)

    # 2. Create sample dummy binary files
    pdf_path = 'sample_blueprint.pdf'
    with open(pdf_path, 'wb') as f:
        f.write(b'%PDF-1.4 sample master layout blueprint binary data bytes for LandOS testing')

    png_path = 'sample_map.png'
    with open(png_path, 'wb') as f:
        f.write(b'\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR sample png binary content')

    txt_path = 'sample_script.txt'
    with open(txt_path, 'w') as f:
        f.write('Invalid file type test')

    # Function to issue multipart upload
    def upload_file(proj_id, filepath, mimetype):
        boundary = '----WebKitFormBoundary7MA4YWxkTrZu0gW'
        filename = os.path.basename(filepath)
        with open(filepath, 'rb') as f:
            file_bytes = f.read()

        body = (
            f'--{boundary}\r\n'
            f'Content-Disposition: form-data; name="file"; filename="{filename}"\r\n'
            f'Content-Type: {mimetype}\r\n\r\n'
        ).encode('utf-8') + file_bytes + (
            f'\r\n--{boundary}\r\n'
            f'Content-Disposition: form-data; name="scale_ratio"\r\n\r\n'
            f'1:500\r\n'
            f'--{boundary}--\r\n'
        ).encode('utf-8')

        req = urllib.request.Request(
            f'http://127.0.0.1:8000/api/v1/projects/{proj_id}/layouts',
            data=body,
            headers={'Content-Type': f'multipart/form-data; boundary={boundary}'},
            method='POST'
        )
        try:
            with urllib.request.urlopen(req) as resp:
                return resp.status, json.loads(resp.read().decode())
        except urllib.error.HTTPError as e:
            return e.code, json.loads(e.read().decode())

    # Test A: Valid PDF Upload
    status_code, res = upload_file(project_id, pdf_path, 'application/pdf')
    print(f'Test A (PDF Upload): Status {status_code} | File: {res.get("fileName")} | Path: {res.get("filePath")}')

    # Test B: Valid PNG Upload
    status_code_png, res_png = upload_file(project_id, png_path, 'image/png')
    print(f'Test B (PNG Upload): Status {status_code_png} | File: {res_png.get("fileName")} | Path: {res_png.get("filePath")}')

    # Test C: Invalid File Type (.txt)
    status_code_txt, res_txt = upload_file(project_id, txt_path, 'text/plain')
    print(f'Test C (Invalid File Type): Status {status_code_txt} | Detail: {res_txt.get("detail")}')

    # Test D: Non-existent Project ID
    status_code_404, res_404 = upload_file('non_existent_proj_123', pdf_path, 'application/pdf')
    print(f'Test D (Nonexistent Project): Status {status_code_404} | Detail: {res_404.get("detail")}')

    # Clean up local temp test files
    for p in [pdf_path, png_path, txt_path]:
        if os.path.exists(p): os.remove(p)

if __name__ == "__main__":
    run_tests()
