const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const venvWin = path.join(root, '.venv', 'Scripts', 'python.exe');
const venvUnix = path.join(root, '.venv', 'bin', 'python');

let py = 'python';
if (fs.existsSync(venvWin)) {
  py = venvWin;
} else if (fs.existsSync(venvUnix)) {
  py = venvUnix;
}

const args = ['-m', 'uvicorn', 'app.main:app', '--app-dir', 'backend', '--host', '127.0.0.1', '--port', '8000', '--reload'];
const child = spawn(py, args, { stdio: 'inherit', cwd: root });

child.on('close', (code) => {
  process.exit(code || 0);
});
