import React, { useState, useEffect, useCallback } from 'react';
import { fileAPI, setAuthHeader } from '../utils/api';
import { useAuth } from '../context/AuthContext';

export default function Dashboard() {
  const { user, token, logout } = useAuth();
  const [files, setFiles]     = useState([]);
  const [trash, setTrash]     = useState([]);
  const [stats, setStats]     = useState({});
  const [tab, setTab]         = useState('files');
  const [uploading, setUp]    = useState(false);
  const [dragOver, setDrag]   = useState(false);
  const [toast, setToast]     = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { setAuthHeader(token); }, [token]);

  const showToast = (msg, type = 'ok') => {
    setToast({ msg, type }); setTimeout(() => setToast(null), 3000);
  };

  const fetchAll = useCallback(async () => {
    try {
      const [a, t, s] = await Promise.all([
        fileAPI.get('/api/files?deleted=false'),
        fileAPI.get('/api/files?deleted=true'),
        fileAPI.get('/api/files/stats'),
      ]);
      setFiles(a.data.files); setTrash(t.data.files); setStats(s.data);
    } catch { showToast('Failed to load files', 'err'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const uploadFile = async file => {
    const fd = new FormData(); fd.append('file', file);
    setUp(true);
    try {
      await fileAPI.post('/api/files/upload', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      showToast(`"${file.name}" uploaded!`); fetchAll();
    } catch (e) { showToast(e.response?.data?.error || 'Upload failed', 'err'); }
    finally { setUp(false); }
  };

  const downloadFile = async (id, name) => {
    try {
      const r = await fileAPI.get(`/api/files/download/${id}`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([r.data]));
      const a = document.createElement('a'); a.href = url; a.download = name; a.click();
      window.URL.revokeObjectURL(url); showToast(`"${name}" downloaded`);
    } catch { showToast('Download failed', 'err'); }
  };

  const deleteFile = async (id, name) => {
    try { await fileAPI.delete(`/api/files/delete/${id}`); showToast(`"${name}" moved to trash`); fetchAll(); }
    catch { showToast('Delete failed', 'err'); }
  };

  const restoreFile = async (id, name) => {
    try { await fileAPI.patch(`/api/files/restore/${id}`); showToast(`"${name}" restored!`); fetchAll(); }
    catch { showToast('Restore failed', 'err'); }
  };

  const permDelete = async (id, name) => {
    if (!window.confirm(`Permanently delete "${name}"?`)) return;
    try { await fileAPI.delete(`/api/files/permanent/${id}`); showToast(`"${name}" deleted forever`); fetchAll(); }
    catch { showToast('Delete failed', 'err'); }
  };

  const fmtSize = kb => kb >= 1024 ? `${(kb/1024).toFixed(1)} MB` : `${kb} KB`;
  const fmtDate = iso => new Date(iso).toLocaleDateString('en-US', { day:'numeric', month:'short', year:'numeric' });
  const list = tab === 'files' ? files : trash;

  return (
    <div className="dash">
      {toast && <div className={`toast toast-${toast.type}`}>{toast.msg}</div>}

      <aside className="sidebar">
        <div className="sb-brand"><span>🔐</span> SafeVault</div>
        <nav>
          <button className={`nav-item ${tab==='files'?'active':''}`} onClick={() => setTab('files')}>
            📁 My Files <span className="nb">{stats.total_files||0}</span>
          </button>
          <button className={`nav-item ${tab==='trash'?'active':''}`} onClick={() => setTab('trash')}>
            🗑️ Trash <span className="nb">{stats.deleted_files||0}</span>
          </button>
        </nav>
        <div className="sb-sep"/>
        <div className="sb-section-title">Microservices</div>
        <a className="ms-link" href="http://localhost:8000" target="_blank" rel="noreferrer">
          <span className="ms-dot green"/>🔐 Auth Service<span className="ms-port">:8000</span>
        </a>
        <a className="ms-link" href="http://localhost:5000" target="_blank" rel="noreferrer">
          <span className="ms-dot orange"/>📦 Upload Service<span className="ms-port">:5000</span>
        </a>
        <a className="ms-link active-ms" href="http://localhost:3000" target="_blank" rel="noreferrer">
          <span className="ms-dot blue"/>⚛️ Frontend<span className="ms-port">:3000</span>
        </a>
        <div className="sb-spacer"/>
        <div className="sb-storage">
          <div className="sl">Storage</div>
          <div className="sv">{stats.total_size_mb||0} MB</div>
          <div className="bar"><div className="bar-fill" style={{width:`${Math.min((stats.total_size_mb||0)/50*100,100)}%`}}/></div>
          <div className="sh">of 50 MB demo limit</div>
        </div>
        <div className="sb-user">
          <div className="avatar">{user?.name?.[0]?.toUpperCase()}</div>
          <div className="uinfo"><div className="uname">{user?.name}</div><div className="uemail">{user?.email}</div></div>
          <button className="logout-btn" onClick={logout} title="Logout">⏻</button>
        </div>
      </aside>

      <main className="main">
        <div className="topbar">
          <div>
            <h2>{tab==='files'?'📁 My Files':'🗑️ Trash'}</h2>
            <p className="sub">{list.length} file{list.length!==1?'s':''} {tab==='files'?'stored securely':'in trash'}</p>
          </div>
          {tab==='files' && (
            <label className="upload-btn">
              <input type="file" onChange={e => { uploadFile(e.target.files[0]); e.target.value=''; }} style={{display:'none'}}/>
              {uploading ? '⟳ Uploading…' : '↑ Upload File'}
            </label>
          )}
        </div>

        {tab==='files' && (
          <div className={`dropzone ${dragOver?'over':''}`}
            onDragOver={e=>{e.preventDefault();setDrag(true)}}
            onDragLeave={()=>setDrag(false)}
            onDrop={e=>{e.preventDefault();setDrag(false);uploadFile(e.dataTransfer.files[0])}}>
            ☁️ &nbsp; Drag &amp; drop files here &nbsp;·&nbsp; <span>Max 50 MB · PDFs, Images, Docs, ZIPs, Videos & more</span>
          </div>
        )}

        {tab==='files' && (
          <div className="stats-row">
            {[['📄',stats.total_files||0,'Active Files'],['💾',(stats.total_size_mb||0)+' MB','Storage'],['🗑️',stats.deleted_files||0,'In Trash'],['🔒','AES-256','Encryption']].map(([ic,v,l])=>(
              <div className="sc" key={l}><div className="sc-ic">{ic}</div><div className="sc-v">{v}</div><div className="sc-l">{l}</div></div>
            ))}
          </div>
        )}

        {loading ? (
          <div className="empty">Loading files…</div>
        ) : list.length===0 ? (
          <div className="empty">
            <span style={{fontSize:'3rem'}}>{tab==='files'?'📂':'🗑️'}</span>
            <p>{tab==='files'?'No files yet — upload your first file!':'Trash is empty'}</p>
          </div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead><tr><th>File</th><th>Size</th><th>{tab==='files'?'Uploaded':'Deleted'}</th><th>Actions</th></tr></thead>
              <tbody>
                {list.map(f => (
                  <tr key={f.file_id}>
                    <td className="fn-cell"><span className="ficon">{f.file_icon}</span><span className="fname">{f.original_name}</span></td>
                    <td className="fsize">{fmtSize(f.file_size_kb)}</td>
                    <td className="fdate">{tab==='files' ? fmtDate(f.uploaded_at) : fmtDate(f.deleted_at)}</td>
                    <td className="factions">
                      {tab==='files' ? <>
                        <button className="ab dl" onClick={()=>downloadFile(f.file_id,f.original_name)}>↓ Download</button>
                        <button className="ab del" onClick={()=>deleteFile(f.file_id,f.original_name)}>🗑 Delete</button>
                      </> : <>
                        <button className="ab res" onClick={()=>restoreFile(f.file_id,f.original_name)}>↩ Restore</button>
                        <button className="ab pdel" onClick={()=>permDelete(f.file_id,f.original_name)}>✕ Delete Forever</button>
                      </>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  );
}
