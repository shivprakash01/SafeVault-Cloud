import os
import uuid
import requests
from datetime import datetime
from flask import Flask, request, jsonify, send_file, render_template_string
from flask_cors import CORS
from pymongo import MongoClient
from werkzeug.utils import secure_filename

app = Flask(__name__)
CORS(app)

MONGO_URI    = os.environ.get('MONGO_URI', 'mongodb://mongo:27017/safevault')
AUTH_SERVICE = os.environ.get('AUTH_SERVICE_URL', 'http://auth-service:8000')
UPLOAD_DIR   = os.environ.get('UPLOAD_DIR', '/app/uploads')

os.makedirs(UPLOAD_DIR, exist_ok=True)

client    = MongoClient(MONGO_URI)
db        = client['safevault']
files_col = db['files']

ALLOWED = {'txt','pdf','png','jpg','jpeg','gif','doc','docx','xls','xlsx','zip','mp4','mp3','csv','json','py','js','html','css'}

def allowed(fn):
    return '.' in fn and fn.rsplit('.', 1)[1].lower() in ALLOWED

def verify_token(req):
    auth = req.headers.get('Authorization', '')
    if not auth.startswith('Bearer '): return None
    token = auth.split(' ')[1]
    try:
        r = requests.post(f'{AUTH_SERVICE}/api/auth/verify', json={'token': token}, timeout=5)
        d = r.json()
        return d['user'] if d.get('valid') else None
    except: return None

def icon(fn):
    ext = fn.rsplit('.', 1)[-1].lower() if '.' in fn else ''
    m = {'pdf':'📄','png':'🖼️','jpg':'🖼️','jpeg':'🖼️','gif':'🖼️','doc':'📝','docx':'📝',
         'xls':'📊','xlsx':'📊','zip':'🗜️','mp4':'🎬','mp3':'🎵','txt':'📃',
         'csv':'📊','json':'⚙️','py':'🐍','js':'📜','html':'🌐','css':'🎨'}
    return m.get(ext, '📁')

# ── Web UI page ───────────────────────────────────────────────────────────────
UI_PAGE = """<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>SafeVault – Upload Service</title>
  <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=DM+Mono:wght@400;500&display=swap" rel="stylesheet"/>
  <style>
    *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
    :root{--bg:#0d0f17;--surface:#141824;--raised:#1c2133;--border:#2a3152;--accent:#4f7cff;--green:#22c55e;--red:#ef4444;--orange:#f97316;--t1:#f0f4ff;--t2:#8b9bc8;--t3:#505a7a;--r:10px}
    body{font-family:'DM Sans',sans-serif;background:var(--bg);color:var(--t1);min-height:100vh;padding:2rem;-webkit-font-smoothing:antialiased}
    header{max-width:900px;margin:0 auto 2.5rem;text-align:center}
    .badge{background:#1a2540;border:1px solid var(--border);color:var(--orange);font-size:.72rem;font-weight:600;letter-spacing:.08em;text-transform:uppercase;padding:.3rem .8rem;border-radius:20px;margin-bottom:1rem;display:inline-block}
    header h1{font-size:2rem;font-weight:700;margin-bottom:.4rem}
    header p{color:var(--t2);font-size:.95rem}
    .port-tag{display:inline-flex;align-items:center;gap:.4rem;background:var(--raised);border:1px solid var(--border);border-radius:8px;padding:.35rem .9rem;font-family:'DM Mono',monospace;font-size:.85rem;color:var(--orange);margin-top:.75rem}
    .container{max-width:900px;margin:0 auto;display:grid;gap:1.5rem}
    .card{background:var(--surface);border:1px solid var(--border);border-radius:14px;padding:1.5rem}
    .card-title{font-size:.78rem;font-weight:600;text-transform:uppercase;letter-spacing:.07em;color:var(--t2);margin-bottom:1.1rem}
    .token-row{display:flex;gap:.6rem;margin-bottom:1rem}
    .token-row input{flex:1;padding:.65rem .9rem;background:var(--raised);border:1px solid var(--border);border-radius:var(--r);color:var(--t1);font-size:.85rem;font-family:'DM Mono',monospace;outline:none;transition:border .2s}
    .token-row input:focus{border-color:var(--orange)}
    .btn{padding:.65rem 1.1rem;background:var(--accent);color:#fff;border:none;border-radius:var(--r);font-size:.88rem;font-weight:600;font-family:inherit;cursor:pointer;transition:opacity .2s;white-space:nowrap}
    .btn:hover{opacity:.85}
    .btn.orange{background:var(--orange)}
    .btn.outline{background:transparent;border:1px solid var(--border);color:var(--t1)}
    .drop-zone{border:2px dashed var(--border);border-radius:12px;padding:2rem;text-align:center;color:var(--t3);font-size:.9rem;cursor:pointer;transition:border .2s,background .2s;margin-bottom:1rem}
    .drop-zone.over{border-color:var(--orange);background:rgba(249,115,22,.06)}
    .drop-zone .icon{font-size:2rem;display:block;margin-bottom:.5rem}
    .drop-hint{font-size:.78rem;margin-top:.4rem;color:var(--t3)}
    #file-input{display:none}
    .msg{padding:.7rem 1rem;border-radius:var(--r);font-size:.83rem;margin-bottom:.85rem;display:none}
    .msg.ok{background:rgba(34,197,94,.12);border:1px solid rgba(34,197,94,.25);color:#86efac;display:block}
    .msg.err{background:rgba(239,68,68,.12);border:1px solid rgba(239,68,68,.25);color:#fca5a5;display:block}
    table{width:100%;border-collapse:collapse;font-size:.85rem}
    thead{background:var(--raised)}
    th{padding:.65rem 1rem;text-align:left;font-size:.75rem;font-weight:600;color:var(--t2);text-transform:uppercase;letter-spacing:.05em}
    td{padding:.75rem 1rem;border-top:1px solid var(--border);vertical-align:middle}
    tr:hover td{background:rgba(255,255,255,.02)}
    .act-btn{padding:.3rem .7rem;border-radius:6px;border:1px solid;font-size:.78rem;cursor:pointer;font-family:inherit;font-weight:500;transition:all .15s}
    .act-btn.dl{border-color:rgba(79,124,255,.4);color:var(--accent);background:rgba(79,124,255,.08)}
    .act-btn.dl:hover{background:var(--accent);color:#fff}
    .act-btn.del{border-color:rgba(239,68,68,.35);color:var(--red);background:rgba(239,68,68,.07)}
    .act-btn.del:hover{background:var(--red);color:#fff}
    .empty{padding:2.5rem;text-align:center;color:var(--t3);font-size:.9rem}
    .routes-grid{display:grid;gap:.5rem}
    .route-row{display:flex;align-items:center;gap:.75rem;padding:.55rem 0;border-bottom:1px solid var(--border);font-size:.83rem}
    .route-row:last-child{border-bottom:none}
    .method{font-family:'DM Mono',monospace;font-size:.72rem;padding:.18rem .5rem;border-radius:4px;min-width:52px;text-align:center;font-weight:600}
    .POST{background:rgba(79,124,255,.15);color:var(--accent)}
    .GET{background:rgba(34,197,94,.15);color:var(--green)}
    .DELETE{background:rgba(239,68,68,.15);color:var(--red)}
    .PATCH{background:rgba(249,115,22,.15);color:var(--orange)}
    .r-path{font-family:'DM Mono',monospace;flex:1}
    .r-desc{color:var(--t3);font-size:.78rem}
    .nav-links{display:flex;justify-content:center;gap:1.5rem;margin-top:2.5rem;padding-top:1.5rem;border-top:1px solid var(--border)}
    .dot{width:8px;height:8px;border-radius:50%;background:var(--green);animation:pulse 2s infinite;display:inline-block}
    @keyframes pulse{0%,100%{opacity:1}50%{opacity:.4}}
    a.link{color:var(--accent);text-decoration:none;font-size:.85rem}
    a.link:hover{text-decoration:underline}
  </style>
</head>
<body>
  <header>
    <div class="badge">Microservice · Port 5000</div>
    <h1>📦 Upload Service</h1>
    <p>Handles file uploads, downloads, soft-delete, restore, and metadata storage in MongoDB. Built with Python Flask.</p>
    <div class="port-tag">▶ localhost:5000</div>
  </header>

  <div class="container">
    <!-- Token Auth -->
    <div class="card">
      <div class="card-title">Step 1 — Paste your JWT Token (login at port 8000 or 3000 first)</div>
      <div class="token-row">
        <input id="token" placeholder="Paste your Bearer token here..."/>
        <button class="btn" onclick="loadFiles()">Load My Files</button>
      </div>
      <div class="msg" id="auth-msg"></div>
    </div>

    <!-- Upload -->
    <div class="card">
      <div class="card-title">Step 2 — Upload a File</div>
      <div class="drop-zone" id="drop-zone" onclick="document.getElementById('file-input').click()">
        <span class="icon">☁️</span>
        Drag & drop a file here, or click to browse
        <p class="drop-hint">Allowed: PDF, Images, Docs, ZIP, MP4, MP3, CSV, JSON, Code files · Max 50 MB</p>
      </div>
      <input type="file" id="file-input" onchange="uploadFile(this.files[0])"/>
      <div class="msg" id="upload-msg"></div>
    </div>

    <!-- File List -->
    <div class="card">
      <div class="card-title">Your Files</div>
      <div id="file-list">
        <div class="empty">No files loaded yet — paste your token and click "Load My Files"</div>
      </div>
    </div>

    <!-- API Reference -->
    <div class="card">
      <div class="card-title">API Routes</div>
      <div class="routes-grid">
        <div class="route-row"><span class="method GET">GET</span><span class="r-path">/health</span><span class="r-desc">Health check</span></div>
        <div class="route-row"><span class="method POST">POST</span><span class="r-path">/api/files/upload</span><span class="r-desc">Upload file (multipart)</span></div>
        <div class="route-row"><span class="method GET">GET</span><span class="r-path">/api/files</span><span class="r-desc">List active files</span></div>
        <div class="route-row"><span class="method GET">GET</span><span class="r-path">/api/files?deleted=true</span><span class="r-desc">List trashed files</span></div>
        <div class="route-row"><span class="method GET">GET</span><span class="r-path">/api/files/download/&lt;id&gt;</span><span class="r-desc">Download file</span></div>
        <div class="route-row"><span class="method DELETE">DELETE</span><span class="r-path">/api/files/delete/&lt;id&gt;</span><span class="r-desc">Soft delete to trash</span></div>
        <div class="route-row"><span class="method PATCH">PATCH</span><span class="r-path">/api/files/restore/&lt;id&gt;</span><span class="r-desc">Restore from trash</span></div>
        <div class="route-row"><span class="method DELETE">DELETE</span><span class="r-path">/api/files/permanent/&lt;id&gt;</span><span class="r-desc">Permanently delete</span></div>
        <div class="route-row"><span class="method GET">GET</span><span class="r-path">/api/files/stats</span><span class="r-desc">File statistics</span></div>
      </div>
    </div>
  </div>

  <div class="nav-links">
    <span style="font-size:.8rem;color:var(--t3);display:flex;align-items:center;gap:.4rem"><span class="dot"></span> Upload Service Running</span>
    <a class="link" href="/health">Check /health</a>
    <a class="link" href="http://localhost:3000" target="_blank">Frontend (3000)</a>
    <a class="link" href="http://localhost:8000" target="_blank">Auth Service (8000)</a>
  </div>

  <script>
    const dz = document.getElementById('drop-zone');
    dz.addEventListener('dragover', e => { e.preventDefault(); dz.classList.add('over'); });
    dz.addEventListener('dragleave', () => dz.classList.remove('over'));
    dz.addEventListener('drop', e => { e.preventDefault(); dz.classList.remove('over'); uploadFile(e.dataTransfer.files[0]); });

    function getToken() { return document.getElementById('token').value.trim(); }

    function showMsg(id, text, ok) {
      const el = document.getElementById(id);
      el.textContent = text; el.className = 'msg ' + (ok ? 'ok' : 'err');
    }

    async function loadFiles() {
      const t = getToken();
      if (!t) { showMsg('auth-msg', '❌ Please paste your JWT token first', false); return; }
      try {
        const r = await fetch('/api/files', { headers: { Authorization: 'Bearer ' + t } });
        const d = await r.json();
        if (!r.ok) { showMsg('auth-msg', '❌ ' + (d.error || 'Failed'), false); return; }
        showMsg('auth-msg', '✅ Loaded ' + d.count + ' file(s)', true);
        renderFiles(d.files);
      } catch(e) { showMsg('auth-msg', '❌ ' + e.message, false); }
    }

    function renderFiles(files) {
      if (!files.length) {
        document.getElementById('file-list').innerHTML = '<div class="empty">No files yet — upload one above!</div>';
        return;
      }
      const rows = files.map(f => `
        <tr>
          <td>${f.file_icon} ${f.original_name}</td>
          <td style="font-family:monospace;color:var(--t2)">${f.file_size_kb} KB</td>
          <td style="color:var(--t2)">${f.uploaded_at ? f.uploaded_at.slice(0,10) : '-'}</td>
          <td style="display:flex;gap:.4rem">
            <button class="act-btn dl" onclick="downloadFile('${f.file_id}','${f.original_name}')">↓ Download</button>
            <button class="act-btn del" onclick="deleteFile('${f.file_id}')">🗑 Delete</button>
          </td>
        </tr>`).join('');
      document.getElementById('file-list').innerHTML = `
        <table>
          <thead><tr><th>File</th><th>Size</th><th>Uploaded</th><th>Actions</th></tr></thead>
          <tbody>${rows}</tbody>
        </table>`;
    }

    async function uploadFile(file) {
      if (!file) return;
      const t = getToken();
      if (!t) { showMsg('upload-msg', '❌ Paste your token first (Step 1)', false); return; }
      const fd = new FormData(); fd.append('file', file);
      showMsg('upload-msg', '⟳ Uploading "' + file.name + '"...', true);
      try {
        const r = await fetch('/api/files/upload', { method:'POST', headers:{Authorization:'Bearer '+t}, body:fd });
        const d = await r.json();
        if (r.ok) { showMsg('upload-msg', '✅ "' + file.name + '" uploaded!', true); loadFiles(); }
        else showMsg('upload-msg', '❌ ' + (d.error || 'Upload failed'), false);
      } catch(e) { showMsg('upload-msg', '❌ ' + e.message, false); }
    }

    async function downloadFile(id, name) {
      const t = getToken();
      const r = await fetch('/api/files/download/' + id, { headers:{Authorization:'Bearer '+t} });
      if (!r.ok) { alert('Download failed'); return; }
      const blob = await r.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href = url; a.download = name; a.click(); URL.revokeObjectURL(url);
    }

    async function deleteFile(id) {
      const t = getToken();
      const r = await fetch('/api/files/delete/' + id, { method:'DELETE', headers:{Authorization:'Bearer '+t} });
      const d = await r.json();
      if (r.ok) { showMsg('auth-msg', '✅ ' + d.message, true); loadFiles(); }
      else showMsg('auth-msg', '❌ ' + (d.error || 'Delete failed'), false);
    }
  </script>
</body>
</html>"""

@app.route('/')
def home():
    return UI_PAGE

@app.route('/health')
def health():
    return jsonify({'status': 'ok', 'service': 'upload-service', 'port': 5000, 'timestamp': datetime.utcnow().isoformat()})

@app.route('/api/files/upload', methods=['POST'])
def upload_file():
    user = verify_token(request)
    if not user: return jsonify({'error': 'Unauthorized'}), 401
    if 'file' not in request.files: return jsonify({'error': 'No file'}), 400
    f = request.files['file']
    if not f.filename or not allowed(f.filename): return jsonify({'error': 'File type not allowed'}), 400
    f.seek(0, 2); size = f.tell(); f.seek(0)
    if size > 50 * 1024 * 1024: return jsonify({'error': 'File too large (max 50MB)'}), 400
    orig   = secure_filename(f.filename)
    fid    = str(uuid.uuid4())
    ext    = orig.rsplit('.', 1)[-1] if '.' in orig else ''
    stored = f"{fid}.{ext}" if ext else fid
    path   = os.path.join(UPLOAD_DIR, stored)
    f.save(path)
    files_col.insert_one({'file_id':fid,'original_name':orig,'stored_name':stored,'file_path':path,
                          'file_size':size,'file_icon':icon(orig),'user_id':user['userId'],
                          'user_email':user['email'],'uploaded_at':datetime.utcnow(),'deleted':False,'deleted_at':None})
    return jsonify({'message':'Uploaded','file_id':fid,'filename':orig,'size':size}), 201

@app.route('/api/files')
def list_files():
    user = verify_token(request)
    if not user: return jsonify({'error': 'Unauthorized'}), 401
    deleted = request.args.get('deleted','false').lower() == 'true'
    docs = list(files_col.find({'user_id':user['userId'],'deleted':deleted}, {'_id':0,'file_path':0}))
    for d in docs:
        for k in ('uploaded_at','deleted_at'):
            if d.get(k) and hasattr(d[k],'isoformat'): d[k] = d[k].isoformat()
        d['file_size_kb'] = round(d.get('file_size',0)/1024, 1)
    return jsonify({'files':docs,'count':len(docs)})

@app.route('/api/files/download/<fid>')
def download(fid):
    user = verify_token(request)
    if not user: return jsonify({'error': 'Unauthorized'}), 401
    doc = files_col.find_one({'file_id':fid,'user_id':user['userId']})
    if not doc: return jsonify({'error': 'Not found'}), 404
    if doc.get('deleted'): return jsonify({'error': 'File is deleted'}), 410
    if not os.path.exists(doc['file_path']): return jsonify({'error': 'File missing'}), 404
    return send_file(doc['file_path'], as_attachment=True, download_name=doc['original_name'])

@app.route('/api/files/delete/<fid>', methods=['DELETE'])
def soft_delete(fid):
    user = verify_token(request)
    if not user: return jsonify({'error': 'Unauthorized'}), 401
    doc = files_col.find_one({'file_id':fid,'user_id':user['userId']})
    if not doc: return jsonify({'error': 'Not found'}), 404
    files_col.update_one({'file_id':fid},{'$set':{'deleted':True,'deleted_at':datetime.utcnow()}})
    return jsonify({'message': 'Moved to trash'})

@app.route('/api/files/restore/<fid>', methods=['PATCH'])
def restore(fid):
    user = verify_token(request)
    if not user: return jsonify({'error': 'Unauthorized'}), 401
    files_col.update_one({'file_id':fid,'user_id':user['userId']},{'$set':{'deleted':False,'deleted_at':None}})
    return jsonify({'message': 'File restored'})

@app.route('/api/files/permanent/<fid>', methods=['DELETE'])
def perm_delete(fid):
    user = verify_token(request)
    if not user: return jsonify({'error': 'Unauthorized'}), 401
    doc = files_col.find_one({'file_id':fid,'user_id':user['userId']})
    if not doc: return jsonify({'error': 'Not found'}), 404
    if os.path.exists(doc.get('file_path','')):
        os.remove(doc['file_path'])
    files_col.delete_one({'file_id':fid})
    return jsonify({'message': 'Permanently deleted'})

@app.route('/api/files/stats')
def stats():
    user = verify_token(request)
    if not user: return jsonify({'error': 'Unauthorized'}), 401
    uid = user['userId']
    total   = files_col.count_documents({'user_id':uid,'deleted':False})
    deleted = files_col.count_documents({'user_id':uid,'deleted':True})
    agg = list(files_col.aggregate([{'$match':{'user_id':uid,'deleted':False}},{'$group':{'_id':None,'s':{'$sum':'$file_size'}}}]))
    sz = agg[0]['s'] if agg else 0
    return jsonify({'total_files':total,'deleted_files':deleted,'total_size_mb':round(sz/1048576,2)})

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=False)
