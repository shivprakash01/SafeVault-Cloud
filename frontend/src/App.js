import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import './App.css';

function Router() {
  const { user, loading } = useAuth();
  const [reg, setReg] = useState(false);
  if (loading) return <div className="splash"><span>🔐</span><h1>SafeVault</h1><div className="spin-lg"/></div>;
  if (user) return <Dashboard/>;
  return (
    <div className="auth-page">
      <div className="blobs"><div className="b1"/><div className="b2"/><div className="b3"/></div>
      {reg ? <Register onSwitch={()=>setReg(false)}/> : <Login onSwitch={()=>setReg(true)}/>}
    </div>
  );
}

export default function App() {
  return <AuthProvider><Router/></AuthProvider>;
}
