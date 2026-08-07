import React, { useState } from 'react';
import { api } from '../utils/api';

interface LoginProps {
  onLoginSuccess: () => void;
}

export const Login: React.FC<LoginProps> = ({ onLoginSuccess }) => {
  const [email, setEmail] = useState('admin@billflow.dev');
  const [password, setPassword] = useState('admin123');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await api.login(email, password);
      api.setToken(res.access_token);
      onLoginSuccess();
    } catch (err: any) {
      console.log('Error logging in:', err);
      setError(err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', padding: '20px' }}>
      <form className="glass-card" onSubmit={handleSubmit} style={{ width: '100%', maxWidth: '400px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <h2 style={{ textAlign: 'center', color: '#fff', fontSize: '24px', letterSpacing: '0.5px' }}>
          <span style={{ background: 'linear-gradient(135deg, var(--primary), var(--secondary))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', fontWeight: 'bold' }}>BillFlow</span> Admin
        </h2>
        <p style={{ color: 'var(--text-muted)', fontSize: '13px', textAlign: 'center', marginBottom: '8px' }}>Log in to manage billing cycles and tenants</p>
        
        {error && <div style={{ background: 'var(--danger-glow)', border: '1px solid var(--danger)', color: '#ff8a8a', padding: '10px', borderRadius: '6px', fontSize: '13px' }}>{error}</div>}

        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <label style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Admin Email</label>
          <input 
            type="email" 
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            style={{ width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border)', borderRadius: '6px', padding: '10px', color: '#fff', outline: 'none' }}
            required
          />
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <label style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Password</label>
          <input 
            type="password" 
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={{ width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border)', borderRadius: '6px', padding: '10px', color: '#fff', outline: 'none' }}
            required
          />
        </div>

        <button 
          type="submit" 
          disabled={loading}
          style={{ width: '100%', background: 'linear-gradient(90deg, var(--primary), var(--secondary))', border: 'none', borderRadius: '6px', padding: '12px', color: '#fff', fontWeight: 'bold', cursor: 'pointer', outline: 'none', marginTop: '10px', transition: 'opacity 0.2s' }}
        >
          {loading ? 'Authenticating...' : 'Access Dashboard'}
        </button>
      </form>
    </div>
  );
};
