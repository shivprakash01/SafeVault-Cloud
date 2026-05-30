import React, { useState } from 'react';
import { authAPI } from '../utils/api';
import { useAuth } from '../context/AuthContext';

export default function Login({ onSwitch }) {
  const { login } = useAuth();
  const [form, setForm]     = useState({ email: '', password: '' });
  const [error, setError]   = useState('');
  const [loading, setLoading] = useState(false);
  const h = e => setForm({ ...form, [e.target.name]: e.target.value });

  const submit = async e => {
    e.preventDefault(); setError(''); setLoading(true);
    try {
      const r = await authAPI.post('/api/auth/login', form);
      login(r.data.user, r.data.token);
    } catch (err) { setError(err.response?.data?.error || 'Login failed'); }
    finally { setLoading(false); }
  };

  return (
    <div className="auth-card">
      <div className="auth-brand"><span>🔐</span><h1>SafeVault</h1><p>Secure Cloud Backup Platform</p></div>
      <form onSubmit={submit}>
        <h2>Sign In</h2>
        {error && <div className="alert err">{error}</div>}
        <div className="fg"><label>Email</label><input type="email" name="email" placeholder="you@example.com" value={form.email} onChange={h} required/></div>
        <div className="fg"><label>Password</label><input type="password" name="password" placeholder="Your password" value={form.password} onChange={h} required/></div>
        <button className="btn-primary" disabled={loading}>{loading ? <span className="spin"/> : 'Sign In'}</button>
        <p className="switch">No account? <button type="button" className="lnk" onClick={onSwitch}>Create one</button></p>
      </form>
      <div className="service-links">
        <span>Other services:</span>
        <a href="http://localhost:8000" target="_blank" rel="noreferrer">Auth Service :8000</a>
        <a href="http://localhost:5000" target="_blank" rel="noreferrer">Upload Service :5000</a>
      </div>
    </div>
  );
}
