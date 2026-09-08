# LandOS Learning Guide: Real Layout File Storage Architecture (Phase P2.3.1)

**Learning Objective:** Understand how LandOS receives real binary layout blueprint files (`.pdf`, `.png`, `.jpg`, `.dwg`) via multipart HTTP requests, securely persists binary files in project-scoped disk storage, manages database transaction rollbacks with physical file cleanup, and prepares for downstream layout extraction.

---

## 1. End-to-End File Upload Lifecycle

```
[1. Client / Swagger / Browser]
    Sends HTTP POST /api/v1/projects/{project_id}/layouts
    Content-Type: multipart/form-data; boundary=----WebKitFormBoundary...
        │
        ▼
[2. FastAPI UploadFile Handler]
    FastAPI parses boundary stream, extracts file binary stream & Form fields
        │
        ▼
[3. Storage Service Validation & Disk Write]
    StorageService.save_layout_file(project_id, upload_file):
      a. Sanitizes filename (removes ../ and dangerous characters)
      b. Validates file extension (.pdf, .png, .jpg, .jpeg, .tiff) and 50MB size limit
      c. Creates project directory: backend/uploads/projects/{project_id}/layouts/
      d. Writes binary chunks to disk -> returns relative storage path
        │
        ▼
[4. SQLAlchemy Database Transaction]
    ProjectService.upload_project_layout(db, project_id, file, scale_ratio):
      a. Creates LayoutSource ORM record (file_name, file_path, file_size_bytes, mime_type, scale_ratio, upload_status='UPLOADED')
      b. Updates project.status = 'LAYOUT_PENDING'
      c. Executes db.commit()
        │
        ▼  (If DB Commit Fails)
  [Rollback Catch Block] ──> db.rollback() ──> storage_service.delete_file_safely(file_path)
        │
        ▼  (If DB Commit Succeeds)
[5. HTTP 201 Created Response]
    Returns LayoutSourceResponse JSON metadata DTO to Client!
```

---

## 2. Deep-Dive: 10 Architectural Questions Answered

### Question 1: How does `multipart/form-data` differ from a standard JSON payload?
- **JSON (`application/json`):** Encodes textual data as UTF-8 key-value strings. It is ideal for structured text attributes (e.g. project name, location), but inefficient for binary files because binary bytes must be Base64 encoded (increasing file payload size by ~33%).
- **Multipart (`multipart/form-data`):** Divides the HTTP request body into separate "parts" using a unique boundary string. Each part contains its own headers (`Content-Disposition: form-data; name="file"; filename="master.pdf"`) and streams raw unencoded binary bytes.

---

### Question 2: Why is `UploadFile` used instead of `bytes` or `str` in FastAPI?
- If you use `file: bytes`, FastAPI loads the entire file into server RAM at once. For a 40MB PDF or high-res layout map, 100 concurrent uploads would consume 4GB of RAM and crash the server.
- `UploadFile` uses a **spooling file stream** (`SpooledTemporaryFile`). Files up to 1MB are held in memory; larger files are spooled to a temporary disk buffer and read in small 64KB chunks (`while chunk := upload_file.file.read(64 * 1024)`), guaranteeing constant low memory usage.

---

### Question 3: Why should PostgreSQL NOT store raw binary files directly (BLOBs) at this stage?
1. **Database Bloating & Performance:** Storing 50MB PDF/CAD files directly in PostgreSQL bytea columns inflates database size rapidly, slowing down DB indexes, buffer cache efficiency, and regular SQL queries.
2. **Backup & Restore Bottlenecks:** Database backups (`pg_dump`) become huge and take hours instead of seconds.
3. **Decoupled Architecture:** Storing binary files on disk (or cloud object storage like AWS S3 / Google Cloud Storage) while keeping light metadata in PostgreSQL allows serving files via CDN/Nginx and backing up databases in milliseconds.

---

### Question 4: Difference between Database Metadata and File/Object Storage

| Concept | File / Object Storage | PostgreSQL Database Metadata |
|---|---|---|
| **What it stores** | Raw binary file bytes (`.pdf`, `.png`, `.dwg`) | Structural index attributes (`file_name`, `file_size_bytes`, `file_path`, `upload_status`) |
| **Where it lives** | Filesystem (`backend/uploads/projects/{id}/layouts/`) | PostgreSQL Table (`layout_sources`) |
| **Primary Query Purpose** | Download, stream, parse vectors, feed AI model | Join with projects, filter by status, check file size |

---

### Question 5: File Path Security & Path Traversal Prevention
To prevent malicious filenames like `../../../../etc/passwd` or `malicious.exe`:
1. **Filename Sanitization:** `StorageService.sanitize_filename()` strips all path separators (`/`, `\`) and restricts filenames to alphanumeric characters, dots, hyphens, and underscores.
2. **Unique Prefixes:** Prepends a unique 8-character UUID hash (`8f3a9b12_master.pdf`) to prevent filename collision overwrites.
3. **Project-Scoped Subdirectories:** Isolates files under `backend/uploads/projects/{project_id}/layouts/`.
4. **Internal Reference Privacy:** The API returns `filePath` as an internal reference (`uploads/projects/...`), never exposing absolute OS filesystem paths (`C:\Users\...`).

---

### Question 6: Transactional Integrity & Filesystem Rollback Handling

> **Why can't PostgreSQL transactions automatically roll back filesystem changes?**

PostgreSQL transactions (`db.commit()`, `db.rollback()`) operate exclusively inside the database engine. The operating system filesystem has no native awareness of PostgreSQL transaction boundaries.

If the binary file is written to disk successfully, but PostgreSQL fails during `db.commit()` (e.g. database disconnect or constraint failure), the file would remain as an **orphan file** on disk forever.

#### LandOS Failure Cleanup Pattern:
```python
try:
    # 1. Save binary file to disk
    original_filename, relative_path, file_size, mime_type = storage_service.save_layout_file(project_id, upload_file)

    # 2. Perform DB insert
    db.add(layout_record)
    db.commit() # Commit transaction
except Exception as e:
    db.rollback()
    # 3. Explicitly cleanup physical file from disk on DB failure!
    storage_service.delete_file_safely(relative_path)
    raise HTTPException(status_code=500, detail="Database transaction failed")
```

---

### Question 7: How this prepares for the AI Layout Engine (Phase P2.3.2+)
With P2.3.1 complete, every project can have real physical layout blueprint files stored at a predictable, project-scoped filesystem path (`uploads/projects/{project_id}/layouts/{id}.pdf`).

When the downstream AI layout scanner runs:
1. It reads the file from `layout_sources.file_path`.
2. Passes the binary file to the vector parsing / OCR engine.
3. Generates plot contours into `plots` and GeoJSON.
