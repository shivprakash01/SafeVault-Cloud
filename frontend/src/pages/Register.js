import React, { useState } from 'react';
import { authAPI } from '../utils/api';
import { useAuth } from '../context/AuthContext';

export default function Register({ onSwitch }) {
  const { login } = useAuth();
  const [form, setForm]     = useState({ name:'', email:'', password:'', confirm:'' });
  const [error, setError]   = useState('');
  const [loading, setLoading] = useState(false);
  const h = e => setForm({ ...form, [e.target.name]: e.target.value });

  const submit = async e => {
    e.preventDefault(); setError('');
    if (form.password !== form.confirm) { setError('Passwords do not match'); return; }
    setLoading(true);
    try {
      const r = await authAPI.post('/api/auth/register', { name: form.name, email: form.email, password: form.password });
      login(r.data.user, r.data.token);
    } catch (err) { setError(err.response?.data?.error || 'Registration failed'); }
    finally { setLoading(false); }
  };

  return (
    <div className="auth-card">
      <div className="auth-brand"><span>🔐</span><h1>SafeVault</h1><p>Secure Cloud Backup Platform</p></div>
      <form onSubmit={submit}>
        <h2>Create Account</h2>
        {error && <div className="alert err">{error}</div>}
        <div className="fg"><label>Full Name</label><input type="text" name="name" placeholder="John Doe" value={form.name} onChange={h} required/></div>
        <div className="fg"><label>Email</label><input type="email" name="email" placeholder="you@example.com" value={form.email} onChange={h} required/></div>
        <div className="fg"><label>Password</label><input type="password" name="password" placeholder="Min 6 characters" value={form.password} onChange={h} minLength={6} required/></div>
        <div className="fg"><label>Confirm Password</label><input type="password" name="confirm" placeholder="Repeat password" value={form.confirm} onChange={h} required/></div>
        <button className="btn-primary" disabled={loading}>{loading ? <span className="spin"/> : 'Create Account'}</button>
        <p className="switch">Have an account? <button type="button" className="lnk" onClick={onSwitch}>Sign in</button></p>
      </form>
      <div className="service-links">
        <span>Other services:</span>
        <a href="http://localhost:8000" target="_blank" rel="noreferrer">Auth Service :8000</a>
        <a href="http://localhost:5000" target="_blank" rel="noreferrer">Upload Service :5000</a>
      </div>
    </div>
  );
}
