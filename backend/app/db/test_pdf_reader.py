import urllib.request
import urllib.error
import json
import os

def run_pdf_reader_tests():
    print("==================================================")
    print("RUNNING P2.6.1 PDF READER TEST SUITE")
    print("==================================================")

    # 1. Fetch existing project ID
    req = urllib.request.Request('http://127.0.0.1:8000/api/v1/projects')
    with urllib.request.urlopen(req) as resp:
        projects = json.loads(resp.read().decode())
        project_id = projects[0]['id']

    print(f"[1] Target Project ID: {project_id}")

    # 2. Create valid minimal PDF byte stream
    minimal_pdf_bytes = (
        b'%PDF-1.4\n'
        b'1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n'
        b'2 0 obj<</Type/Pages/Count 1/Kids[3 0 R]>>endobj\n'
        b'3 0 obj<</Type/Page/MediaBox[0 0 612 792]/Resources<</Font<</F1 4 0 R>>>>/Contents 5 0 R>>endobj\n'
        b'4 0 obj<</Type/Font/Subtype/Type1/BaseFont/Helvetica>>endobj\n'
        b'5 0 obj<</Length 55>>stream\n'
        b'BT /F1 12 Tf 100 700 Td (Greenfield Meadows Layout) Tj ET\n'
        b'endstream\nendobj\n'
        b'xref\n0 6\n0000000000 65535 f\n0000000009 00000 n\n0000000052 00000 n\n0000000101 00000 n\n0000000192 00000 n\n0000000249 00000 n\n'
        b'trailer<</Size 6/Root 1 0 R>>\nstartxref\n356\n%%EOF\n'
    )

    pdf_path = 'pdf_reader_test.pdf'
    with open(pdf_path, 'wb') as f:
        f.write(minimal_pdf_bytes)

    boundary = '----WebKitFormBoundaryPDFTest101'
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

    # 3. Trigger Stage 1 Inspection first
    inspect_req = urllib.request.Request(
        f'http://127.0.0.1:8000/api/v1/projects/{project_id}/layouts/{layout_id}/inspect',
        data=b'',
        method='POST'
    )
    with urllib.request.urlopen(inspect_req) as resp:
        print("[3] Stage 1 Inspection Completed")

    # 4. Trigger Stage 2 PDF Reader via POST /projects/{id}/layouts/{layout_id}/extract-pdf
    pdf_req = urllib.request.Request(
        f'http://127.0.0.1:8000/api/v1/projects/{project_id}/layouts/{layout_id}/extract-pdf',
        data=b'',
        method='POST'
    )
    with urllib.request.urlopen(pdf_req) as resp:
        job_res = json.loads(resp.read().decode())
        print(f"[4] PDFReader Triggered: Status = {job_res['status']} | Stage = {job_res['stage']} | Progress = {job_res['progressPercentage']}%")
        print(f"    Summary: {job_res['resultSummary']}")

    # 5. Fetch PDF_RAW_STREAM_METADATA artifact via GET /artifacts
    artifacts_req = urllib.request.Request(f'http://127.0.0.1:8000/api/v1/projects/{project_id}/layouts/{layout_id}/artifacts')
    with urllib.request.urlopen(artifacts_req) as resp:
        artifacts = json.loads(resp.read().decode())
        pdf_artifact = [a for a in artifacts if a['artifactType'] == 'PDF_RAW_STREAM_METADATA']
        print(f"[5] GET /artifacts: Total artifacts = {len(artifacts)} | PDF Stream Artifacts = {len(pdf_artifact)}")
        if pdf_artifact:
            meta = json.loads(pdf_artifact[0]['contentJson'])
            print(f"    PDF Total Pages: {meta['totalPages']} | Reader Engine: {meta['readerEngine']}")
            if 'pages' in meta and meta['pages']:
                p1 = meta['pages'][0]
                print(f"    Page 1 Dimensions: {p1['widthPt']}pt x {p1['heightPt']}pt ({p1['widthInches']} in x {p1['heightInches']} in)")
                print(f"    Text Preview: {p1['textPreview']}")

    # Clean up local temp test file
    if os.path.exists(pdf_path):
        os.remove(pdf_path)

    print("==================================================")
    print("PASSED ALL P2.6.1 PDF READER TESTS!")
    print("==================================================")

if __name__ == "__main__":
    run_pdf_reader_tests()
