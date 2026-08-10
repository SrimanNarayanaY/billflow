import React, { useState } from 'react';
import { api } from '../utils/api';

interface LoginProps {
  onLoginSuccess: () => void;
}

export const Login: React.FC<LoginProps> = ({ onLoginSuccess }) => {
  const [loginMode, setLoginMode] = useState<'admin' | 'tenant'>('admin');
  const [email, setEmail] = useState('admin@billflow.dev');
  const [password, setPassword] = useState('admin123');
  const [apiKey, setApiKey] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showApiKey, setShowApiKey] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (loginMode === 'tenant') {
        if (!apiKey.trim()) throw new Error('API Key is required');
        localStorage.setItem('billflow_api_key', apiKey.trim());
        await api.getProfile(); // verifies key validity
        onLoginSuccess();
      } else {
        const res = await api.login(email, password);
        api.setToken(res.accessToken);
        onLoginSuccess();
      }
    } catch (err: any) {
      console.log('Error logging in:', err);
      if (loginMode === 'tenant') {
        localStorage.removeItem('billflow_api_key');
      }
      setError(err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', padding: '20px' }}>
      <form className="glass-card" onSubmit={handleSubmit} style={{ width: '100%', maxWidth: '400px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <h2 style={{ textAlign: 'center', color: '#fff', fontSize: '24px', letterSpacing: '0.5px' }}>
          <span style={{ background: 'linear-gradient(135deg, var(--primary), var(--secondary))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', fontWeight: 'bold' }}>BillFlow</span> Panel
        </h2>
        <p style={{ color: 'var(--text-muted)', fontSize: '13px', textAlign: 'center', marginBottom: '8px' }}>Log in to manage billing cycles and subscriptions</p>
        
        {/* Toggle Login Mode */}
        <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', marginBottom: '8px' }}>
          <button
            type="button"
            onClick={() => { setLoginMode('admin'); setError(''); }}
            style={{
              flex: 1, padding: '10px', background: loginMode === 'admin' ? 'rgba(255,255,255,0.05)' : 'none',
              border: 'none', borderBottom: loginMode === 'admin' ? '2px solid var(--primary)' : 'none',
              color: '#fff', cursor: 'pointer', fontWeight: 'bold', outline: 'none'
            }}
          >
            Admin Panel
          </button>
          <button
            type="button"
            onClick={() => { setLoginMode('tenant'); setError(''); }}
            style={{
              flex: 1, padding: '10px', background: loginMode === 'tenant' ? 'rgba(255,255,255,0.05)' : 'none',
              border: 'none', borderBottom: loginMode === 'tenant' ? '2px solid var(--primary)' : 'none',
              color: '#fff', cursor: 'pointer', fontWeight: 'bold', outline: 'none'
            }}
          >
            Tenant Portal
          </button>
        </div>

        {error && <div style={{ background: 'var(--danger-glow)', border: '1px solid var(--danger)', color: '#ff8a8a', padding: '10px', borderRadius: '6px', fontSize: '13px' }}>{error}</div>}

        {loginMode === 'admin' ? (
          <>
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
              <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                <input 
                  type={showPassword ? 'text' : 'password'} 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  style={{ width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border)', borderRadius: '6px', padding: '10px 40px 10px 10px', color: '#fff', outline: 'none' }}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{
                    position: 'absolute', right: '10px', background: 'none', border: 'none',
                    color: 'var(--text-muted)', cursor: 'pointer', outline: 'none', display: 'flex',
                    alignItems: 'center', padding: '4px'
                  }}
                >
                  {showPassword ? (
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                      <path d="M13.359 11.238C15.06 9.72 16 8 16 8s-3-5.5-8-5.5a8.09 8.09 0 0 0-2.79.512l.742.742c.633-.162 1.341-.254 2.048-.254 2.12 0 3.879 1.168 5.168 2.457A13.137 13.137 0 0 1 14.828 8c-.058.087-.122.183-.195.288-.225.322-.527.755-.89 1.189l.816.816zM8 5.5a2.5 2.5 0 0 1 2.5 2.5c0 .248-.037.485-.104.707l.764.764c.2-.44.34-1.026.34-1.471a3.5 3.5 0 0 0-3.5-3.5c-.445 0-1.031.14-1.47.34L7.293 4.896A2.495 2.495 0 0 1 8 5.5zM11.612 9.564L1.172 2.172 2.172 1.172l10.44 10.44-1 1zm-1.8 1.8a7.862 7.862 0 0 1-1.812.388c-2.12 0-3.879-1.168-5.168-2.457A13.134 13.134 0 0 1 1.172 8c.058-.087.122-.183.195-.288.335-.48.83-1.12 1.465-1.755a7.86 7.86 0 0 1 1.625-1.2l.85.85a7.015 7.015 0 0 0-1.16 1.093c-.93.93-1.63 2.12-1.63 3.3 0 1.18.7 2.37 1.63 3.3.93.93 2.12 1.63 3.3 1.63 1.18 0 2.37-.7 3.3-1.63a7.014 7.014 0 0 0 1.093-1.16l.85.85zM6.641 8.85a2.5 2.5 0 0 0 3.209-3.209L6.64 8.85z"/>
                    </svg>
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                      <path d="M16 8s-3-5.5-8-5.5S0 8 0 8s3 5.5 8 5.5S16 8 16 8zM1.173 8a13.133 13.133 0 0 1 1.66-2.043C4.12 4.668 5.88 3.5 8 3.5c2.12 0 3.879 1.168 5.168 2.457A13.133 13.133 0 0 1 14.828 8c-.058.087-.122.183-.195.288-.335.48-.83 1.12-1.465 1.755C11.879 11.332 10.119 12.5 8 12.5c-2.12 0-3.879-1.168-5.168-2.457A13.134 13.134 0 0 1 1.172 8zM8 5.5a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5zM4.5 8a3.5 3.5 0 1 1 7 0 3.5 3.5 0 0 1-7 0z"/>
                    </svg>
                  )}
                </button>
              </div>
            </div>
          </>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Tenant API Key</label>
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <input 
                type={showApiKey ? 'text' : 'password'} 
                placeholder="billflow_xxxx_xxxx"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                style={{ width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border)', borderRadius: '6px', padding: '10px 40px 10px 10px', color: '#fff', outline: 'none' }}
                required
              />
              <button
                type="button"
                onClick={() => setShowApiKey(!showApiKey)}
                style={{
                  position: 'absolute', right: '10px', background: 'none', border: 'none',
                  color: 'var(--text-muted)', cursor: 'pointer', outline: 'none', display: 'flex',
                  alignItems: 'center', padding: '4px'
                }}
              >
                {showApiKey ? (
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                    <path d="M13.359 11.238C15.06 9.72 16 8 16 8s-3-5.5-8-5.5a8.09 8.09 0 0 0-2.79.512l.742.742c.633-.162 1.341-.254 2.048-.254 2.12 0 3.879 1.168 5.168 2.457A13.137 13.137 0 0 1 14.828 8c-.058.087-.122.183-.195.288-.225.322-.527.755-.89 1.189l.816.816zM8 5.5a2.5 2.5 0 0 1 2.5 2.5c0 .248-.037.485-.104.707l.764.764c.2-.44.34-1.026.34-1.471a3.5 3.5 0 0 0-3.5-3.5c-.445 0-1.031.14-1.47.34L7.293 4.896A2.495 2.495 0 0 1 8 5.5zM11.612 9.564L1.172 2.172 2.172 1.172l10.44 10.44-1 1zm-1.8 1.8a7.862 7.862 0 0 1-1.812.388c-2.12 0-3.879-1.168-5.168-2.457A13.134 13.134 0 0 1 1.172 8c.058-.087.122-.183.195-.288.335-.48.83-1.12 1.465-1.755a7.86 7.86 0 0 1 1.625-1.2l.85.85a7.015 7.015 0 0 0-1.16 1.093c-.93.93-1.63 2.12-1.63 3.3 0 1.18.7 2.37 1.63 3.3.93.93 2.12 1.63 3.3 1.63 1.18 0 2.37-.7 3.3-1.63a7.014 7.014 0 0 0 1.093-1.16l.85.85zM6.641 8.85a2.5 2.5 0 0 0 3.209-3.209L6.64 8.85z"/>
                  </svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                    <path d="M16 8s-3-5.5-8-5.5S0 8 0 8s3 5.5 8 5.5S16 8 16 8zM1.173 8a13.133 13.133 0 0 1 1.66-2.043C4.12 4.668 5.88 3.5 8 3.5c2.12 0 3.879 1.168 5.168 2.457A13.133 13.133 0 0 1 14.828 8c-.058.087-.122.183-.195.288-.335.48-.83 1.12-1.465 1.755C11.879 11.332 10.119 12.5 8 12.5c-2.12 0-3.879-1.168-5.168-2.457A13.134 13.134 0 0 1 1.172 8zM8 5.5a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5zM4.5 8a3.5 3.5 0 1 1 7 0 3.5 3.5 0 0 1-7 0z"/>
                  </svg>
                )}
              </button>
            </div>
          </div>
        )}

        <button 
          type="submit" 
          disabled={loading}
          style={{ width: '100%', background: 'linear-gradient(90deg, var(--primary), var(--secondary))', border: 'none', borderRadius: '6px', padding: '12px', color: '#fff', fontWeight: 'bold', cursor: 'pointer', outline: 'none', marginTop: '10px', transition: 'opacity 0.2s' }}
        >
          {loading ? 'Authenticating...' : loginMode === 'admin' ? 'Access Dashboard' : 'Enter Portal'}
        </button>
      </form>
    </div>
  );
};
