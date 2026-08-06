# Admin Dashboard UI & Dunning State Machine Fix Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement the React + TypeScript + Vite dashboard in the `/frontend` directory using a custom Neon Glassmorphism theme, and fix the backend dunning webhook logic so payment retries correctly progress the dunning states.

**Architecture:** 
1. **Backend**: Modify the webhook controller handler to accept status updates for `'past_due'` subscriptions.
2. **Frontend**: Initialize a Vite React-TS project, styled entirely with a custom Vanilla CSS Glassmorphism theme. Implement unified layout state with a left sidebar, tenant status grid, and right-hand sliding drawer for tenant control, real-time usage metrics, and dunning engine simulation triggers.

**Tech Stack:** React 18, Vite, TypeScript, Vanilla CSS (matching Neon Glass theme), Native Fetch API.

## Global Constraints
* Every REST request resolves to exactly one tenant; admin requests use standard JWT authentication.
* Styling must be Vanilla CSS for premium visual control (no TailwindCSS).
* Do not use external charting libraries unless requested; custom visual CSS progress bars are preferred for usage meters.

---

### Task 1: Fix Backend Dunning Webhook Logic

**Files:**
* Modify: [webhooks.service.ts](file:///c:/Users/91999/Desktop/BillFlow/backend/src/webhooks/webhooks.service.ts#L122)

**Interfaces:**
* Consumes: `WebhookEvent` payload from the simulation processor.
* Produces: Sequential dunning transitions (`retry_1` -> `retry_2` -> `suspend` -> `suspended`) upon subsequent failures.

- [x] **Step 1: Write the minimal implementation change**
Change the condition in `backend/src/webhooks/webhooks.service.ts` near line 121:
```typescript
    const subscription = await this.subscriptionsService.findByTenant(invoice.tenantId);
    if (subscription && (subscription.status === 'active' || subscription.status === 'past_due')) {
      await this.dunningService.handlePaymentFailed(subscription.id, reason);
    }
```

- [ ] **Step 2: Commit the backend bug fix**
```bash
git add backend/src/webhooks/webhooks.service.ts
git commit -m "fix(backend): allow past_due subscriptions to advance dunning stage"
```

---

### Task 2: Scaffold React Frontend Application

**Files:**
* Create: [frontend/](file:///c:/Users/91999/Desktop/BillFlow/frontend/)

- [ ] **Step 1: Create directory and run Vite initializer**
Run command in PowerShell:
```powershell
New-Item -ItemType Directory -Force "c:\Users\91999\Desktop\BillFlow\frontend"
```

- [ ] **Step 2: Scaffold React template**
Run command inside `c:\Users\91999\Desktop\BillFlow\frontend`:
```powershell
npx -y create-vite@latest ./ --template react-ts
```

- [ ] **Step 3: Run npm install**
Run command inside `c:\Users\91999\Desktop\BillFlow\frontend`:
```powershell
npm install
```

- [ ] **Step 4: Verify build works**
Run command:
```powershell
npm run build
```
Expected: successful compilation without errors.

- [ ] **Step 5: Commit scaffolding**
```bash
git add frontend/
git commit -m "feat(frontend): scaffold react ts vite application"
```

---

### Task 3: Implement Dashboard Style System (Glassmorphism Dark Theme)

**Files:**
* Create/Modify: [frontend/src/index.css](file:///c:/Users/91999/Desktop/BillFlow/frontend/src/index.css)
* Delete/Clean: [frontend/src/App.css](file:///c:/Users/91999/Desktop/BillFlow/frontend/src/App.css) (remove or empty it)

- [ ] **Step 1: Write index.css with premium Neon Glass variables and rules**
Overwrite `frontend/src/index.css` with:
```css
@import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700&display=swap');

:root {
  --bg-main: #070b13;
  --bg-card: rgba(255, 255, 255, 0.02);
  --bg-drawer: rgba(13, 17, 28, 0.85);
  --border: rgba(255, 255, 255, 0.08);
  --border-glow: rgba(168, 85, 247, 0.2);
  --primary: #a855f7;
  --primary-glow: rgba(168, 85, 247, 0.4);
  --secondary: #3b82f6;
  --secondary-glow: rgba(59, 130, 246, 0.4);
  --text-main: #f8fafc;
  --text-muted: #94a3b8;
  
  --success: #10b981;
  --warning: #f59e0b;
  --danger: #ef4444;
  --success-glow: rgba(16, 185, 129, 0.2);
  --warning-glow: rgba(245, 158, 11, 0.2);
  --danger-glow: rgba(239, 68, 68, 0.2);
}

* {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

body {
  background-color: var(--bg-main);
  color: var(--text-main);
  font-family: 'Outfit', sans-serif;
  overflow-x: hidden;
}

/* Glassmorphism Card Style */
.glass-card {
  background: var(--bg-card);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: 20px;
  box-shadow: 0 8px 32px 0 rgba(0, 0, 0, 0.37);
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.glass-card:hover {
  border-color: var(--border-glow);
  box-shadow: 0 8px 32px 0 var(--primary-glow);
  transform: translateY(-2px);
}

/* Scrollbars */
::-webkit-scrollbar {
  width: 6px;
  height: 6px;
}
::-webkit-scrollbar-track {
  background: transparent;
}
::-webkit-scrollbar-thumb {
  background: var(--border);
  border-radius: 3px;
}
::-webkit-scrollbar-thumb:hover {
  background: var(--text-muted);
}
```

- [ ] **Step 2: Empty App.css to prevent style clashes**
Overwrite `frontend/src/App.css` with an empty string.

- [ ] **Step 3: Commit styles**
```bash
git add frontend/src/index.css frontend/src/App.css
git commit -m "feat(frontend): implement glassmorphism css theme"
```

---

### Task 4: Implement API Client Utility

**Files:**
* Create: [frontend/src/utils/api.ts](file:///c:/Users/91999/Desktop/BillFlow/frontend/src/utils/api.ts)

- [ ] **Step 1: Write api.ts helper file**
Write the following content into `frontend/src/utils/api.ts`:
```typescript
const BASE_URL = 'http://localhost:3000/api';

function getHeaders() {
  const token = localStorage.getItem('billflow_token');
  return {
    'Content-Type': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {})
  };
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(`${BASE_URL}${endpoint}`, {
    ...options,
    headers: {
      ...getHeaders(),
      ...options.headers,
    },
  });

  if (!response.ok) {
    const text = await response.text();
    let message = 'An error occurred';
    try {
      const parsed = JSON.parse(text);
      message = parsed.message || message;
    } catch {
      message = text || message;
    }
    throw new Error(message);
  }

  const text = await response.text();
  return text ? JSON.parse(text) : {};
}

export interface Plan {
  id: string;
  name: string;
  price: number;
  billingInterval: string;
  usageLimits: Record<string, number>;
}

export interface Tenant {
  id: string;
  name: string;
  apiKeyHash: string;
  status: 'active' | 'suspended';
  subscription?: {
    id: string;
    status: string;
    plan: Plan;
    currentPeriodStart: string;
    currentPeriodEnd: string;
    dunningStage: string | null;
  };
}

export interface Invoice {
  id: string;
  periodStart: string;
  periodEnd: string;
  status: 'draft' | 'open' | 'paid' | 'void';
  totalAmount: number;
  dueAt: string;
}

export const api = {
  setToken(token: string) {
    localStorage.setItem('billflow_token', token);
  },
  getToken() {
    return localStorage.getItem('billflow_token');
  },
  logout() {
    localStorage.removeItem('billflow_token');
  },
  async login(email: string, password: string): Promise<{ access_token: string }> {
    return request<{ access_token: string }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
  },
  async getTenants(): Promise<Tenant[]> {
    return request<Tenant[]>('/tenants');
  },
  async getPlans(): Promise<Plan[]> {
    return request<Plan[]>('/plans');
  },
  async getUsage(tenantId: string): Promise<Record<string, number>> {
    return request<Record<string, number>>(`/usage/${tenantId}/current`);
  },
  async getInvoices(tenantId: string): Promise<Invoice[]> {
    return request<Invoice[]>(`/invoices/${tenantId}`);
  },
  async changePlan(subscriptionId: string, planId: string): Promise<any> {
    return request(`/subscriptions/${subscriptionId}/change-plan`, {
      method: 'PATCH',
      body: JSON.stringify({ planId }),
    });
  },
  async payInvoice(invoiceId: string): Promise<any> {
    return request(`/invoices/${invoiceId}/pay`, {
      method: 'POST',
    });
  },
  async simulateFailure(tenantId: string): Promise<any> {
    return request(`/dunning/${tenantId}/simulate-failure`, {
      method: 'POST',
      body: JSON.stringify({ reason: 'card_declined' }),
    });
  },
  async getDunningStatus(tenantId: string): Promise<any> {
    return request(`/dunning/${tenantId}/status`);
  },
  async triggerBillingCycle(): Promise<any> {
    return request('/invoices/generate-due', {
      method: 'POST',
    });
  }
};
```

- [ ] **Step 2: Commit api client**
```bash
git add frontend/src/utils/api.ts
git commit -m "feat(frontend): add api utility module"
```

---

### Task 5: Implement Login Component

**Files:**
* Create: [frontend/src/components/Login.tsx](file:///c:/Users/91999/Desktop/BillFlow/frontend/src/components/Login.tsx)

- [ ] **Step 1: Create Login screen**
Write the following content to `frontend/src/components/Login.tsx`:
```tsx
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
```

- [ ] **Step 2: Commit Login component**
```bash
git add frontend/src/components/Login.tsx
git commit -m "feat(frontend): create login credentials form"
```

---

### Task 6: Implement Unified Dashboard & Tenant Drawer

**Files:**
* Create: [frontend/src/components/Dashboard.tsx](file:///c:/Users/91999/Desktop/BillFlow/frontend/src/components/Dashboard.tsx)
* Create: [frontend/src/components/TenantDrawer.tsx](file:///c:/Users/91999/Desktop/BillFlow/frontend/src/components/TenantDrawer.tsx)

- [ ] **Step 1: Write TenantDrawer.tsx with usage bars, invoices, and failure simulator**
Write the following content to `frontend/src/components/TenantDrawer.tsx`:
```tsx
import React, { useState, useEffect } from 'react';
import { api, Tenant, Plan, Invoice } from '../utils/api';

interface DrawerProps {
  tenant: Tenant | null;
  plans: Plan[];
  onClose: () => void;
  onRefreshTenant: () => void;
}

export const TenantDrawer: React.FC<DrawerProps> = ({ tenant, plans, onClose, onRefreshTenant }) => {
  const [usage, setUsage] = useState<Record<string, number>>({});
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [dunning, setDunning] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [message, setMessage] = useState({ text: '', type: '' });

  useEffect(() => {
    if (tenant) {
      loadDetails();
    }
  }, [tenant]);

  const loadDetails = async () => {
    if (!tenant) return;
    setLoading(true);
    try {
      const [usageData, invoiceData, dunningData] = await Promise.all([
        api.getUsage(tenant.id),
        api.getInvoices(tenant.id),
        api.getDunningStatus(tenant.id).catch(() => null)
      ]);
      setUsage(usageData);
      setInvoices(invoiceData);
      setDunning(dunningData);
    } catch (err: any) {
      showMsg(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const showMsg = (text: string, type: 'success' | 'error') => {
    setMessage({ text, type });
    setTimeout(() => setMessage({ text: '', type: '' }), 4000);
  };

  if (!tenant) return null;

  const sub = tenant.subscription;

  const handlePlanChange = async (planId: string) => {
    if (!sub) return;
    setActionLoading(true);
    try {
      await api.changePlan(sub.id, planId);
      showMsg('Plan updated and mid-cycle proration applied!', 'success');
      onRefreshTenant();
      loadDetails();
    } catch (err: any) {
      showMsg(err.message, 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handlePay = async (invoiceId: string) => {
    setActionLoading(true);
    try {
      await api.payInvoice(invoiceId);
      showMsg('Simulated charge triggered. Delivering Razorpay webhook...', 'success');
      setTimeout(() => {
        onRefreshTenant();
        loadDetails();
      }, 2000);
    } catch (err: any) {
      showMsg(err.message, 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleFailPayment = async () => {
    setActionLoading(true);
    try {
      await api.simulateFailure(tenant.id);
      showMsg('Payment failed! Scheduled next dunning cron step.', 'success');
      onRefreshTenant();
      loadDetails();
    } catch (err: any) {
      showMsg(err.message, 'error');
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div style={{
      position: 'fixed', top: 0, right: 0, width: '500px', height: '100vh',
      background: 'var(--bg-drawer)', borderLeft: '1px solid var(--border)',
      boxShadow: '-10px 0 30px rgba(0,0,0,0.5)', backdropFilter: 'blur(20px)',
      padding: '30px', overflowY: 'auto', zIndex: 100, display: 'flex', flexDirection: 'column', gap: '20px'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2 style={{ fontSize: '20px', fontWeight: 'bold' }}>{tenant.name} Details</h2>
        <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#fff', fontSize: '20px', cursor: 'pointer' }}>✕</button>
      </div>

      {message.text && (
        <div style={{
          background: message.type === 'success' ? 'var(--success-glow)' : 'var(--danger-glow)',
          border: `1px solid ${message.type === 'success' ? 'var(--success)' : 'var(--danger)'}`,
          color: message.type === 'success' ? '#8fff8f' : '#ff8a8a',
          padding: '10px', borderRadius: '6px', fontSize: '13px'
        }}>{message.text}</div>
      )}

      {loading ? (
        <div style={{ color: 'var(--text-muted)', fontSize: '14px', textAlign: 'center', margin: '40px 0' }}>Loading tenant details...</div>
      ) : (
        <>
          <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '8px', padding: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-muted)', fontSize: '12px' }}>Subscription Status</span>
              <span style={{
                color: sub?.status === 'active' ? 'var(--success)' : sub?.status === 'past_due' ? 'var(--warning)' : 'var(--danger)',
                fontWeight: 'bold', textTransform: 'capitalize', fontSize: '12px'
              }}>{sub?.status || 'No Active Subscription'}</span>
            </div>
            {dunning?.dunningStage && (
              <div style={{ display: 'flex', justifyContent: 'space-between', background: 'rgba(245, 158, 11, 0.05)', padding: '6px', borderRadius: '4px', border: '1px solid rgba(245, 158, 11, 0.2)' }}>
                <span style={{ color: 'var(--warning)', fontSize: '11px', fontWeight: 'bold' }}>Dunning Active</span>
                <span style={{ color: '#fff', fontSize: '11px' }}>Stage: {dunning.dunningStage}</span>
              </div>
            )}
          </div>

          <div>
            <h3 style={{ fontSize: '14px', color: 'var(--text-muted)', marginBottom: '10px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Current Plan Usage</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {sub ? (
                Object.entries(sub.plan.usageLimits).map(([metric, limit]) => {
                  const used = usage[metric] || 0;
                  const pct = Math.min((used / limit) * 100, 100);
                  return (
                    <div key={metric} style={{ background: 'rgba(255,255,255,0.02)', padding: '10px', borderRadius: '6px', border: '1px solid var(--border)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '6px' }}>
                        <span style={{ textTransform: 'capitalize' }}>{metric.replace('_', ' ')}</span>
                        <span>{used} / {limit}</span>
                      </div>
                      <div style={{ width: '100%', height: '6px', background: 'rgba(255,255,255,0.05)', borderRadius: '3px', overflow: 'hidden' }}>
                        <div style={{ width: `${pct}%`, height: '100%', background: 'linear-gradient(90deg, var(--primary), var(--secondary))', borderRadius: '3px' }}></div>
                      </div>
                    </div>
                  );
                })
              ) : <div style={{ color: 'var(--text-muted)', fontSize: '13px' }}>No active limits</div>}
            </div>
          </div>

          <div>
            <h3 style={{ fontSize: '14px', color: 'var(--text-muted)', marginBottom: '10px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Change Plan</h3>
            <select
              disabled={actionLoading || !sub}
              value={sub?.plan.id || ''}
              onChange={(e) => handlePlanChange(e.target.value)}
              style={{
                width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border)',
                borderRadius: '6px', padding: '10px', color: '#fff', outline: 'none', cursor: 'pointer'
              }}
            >
              {plans.map(p => <option key={p.id} value={p.id} style={{ background: '#121620' }}>{p.name} - ${(p.price / 100).toFixed(2)}/mo</option>)}
            </select>
          </div>

          <div>
            <h3 style={{ fontSize: '14px', color: 'var(--text-muted)', marginBottom: '10px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Invoices</h3>
            <div style={{ maxHeight: '180px', overflowY: 'auto', border: '1px solid var(--border)', borderRadius: '6px' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px', textAlign: 'left' }}>
                <thead>
                  <tr style={{ background: 'rgba(255,255,255,0.03)', borderBottom: '1px solid var(--border)' }}>
                    <th style={{ padding: '8px' }}>Period</th>
                    <th style={{ padding: '8px' }}>Amount</th>
                    <th style={{ padding: '8px' }}>Status</th>
                    <th style={{ padding: '8px' }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {invoices.length > 0 ? (
                    invoices.map(inv => (
                      <tr key={inv.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                        <td style={{ padding: '8px', opacity: 0.8 }}>{inv.periodStart.slice(5,10)} to {inv.periodEnd.slice(5,10)}</td>
                        <td style={{ padding: '8px' }}>${(inv.totalAmount / 100).toFixed(2)}</td>
                        <td style={{ padding: '8px' }}>
                          <span style={{
                            color: inv.status === 'paid' ? 'var(--success)' : inv.status === 'open' ? 'var(--warning)' : 'var(--danger)',
                            fontWeight: 'bold'
                          }}>{inv.status}</span>
                        </td>
                        <td style={{ padding: '8px' }}>
                          {inv.status === 'open' && (
                            <button
                              disabled={actionLoading}
                              onClick={() => handlePay(inv.id)}
                              style={{ background: 'var(--success)', border: 'none', borderRadius: '4px', padding: '3px 8px', color: '#fff', cursor: 'pointer', fontSize: '9px', fontWeight: 'bold' }}
                            >Pay</button>
                          )}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={4} style={{ padding: '12px', textAlign: 'center', color: 'var(--text-muted)' }}>No invoices generated yet</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div style={{ marginTop: 'auto', paddingTop: '20px', borderTop: '1px solid var(--border)' }}>
            <h3 style={{ fontSize: '12px', color: 'var(--danger)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Simulation Console</h3>
            <button
              disabled={actionLoading || sub?.status === 'suspended'}
              onClick={handleFailPayment}
              style={{
                width: '100%', background: 'var(--danger)', border: 'none', borderRadius: '6px',
                padding: '10px', color: '#fff', fontWeight: 'bold', cursor: 'pointer', transition: 'opacity 0.2s'
              }}
            >
              Simulate Card Payment Failure
            </button>
            <p style={{ color: 'var(--text-muted)', fontSize: '10px', marginTop: '6px', textAlign: 'center' }}>
              Simulates a declined payment. Triggers the dunning ladder retry cron loop (retry_1 -&gt; retry_2 -&gt; suspend).
            </p>
          </div>
        </>
      )}
    </div>
  );
};
```

- [ ] **Step 2: Write Dashboard.tsx component with tenant list, search, and manual cycle closer**
Write the following content to `frontend/src/components/Dashboard.tsx`:
```tsx
import React, { useState, useEffect } from 'react';
import { api, Tenant, Plan } from '../utils/api';
import { TenantDrawer } from './TenantDrawer';

interface DashboardProps {
  onLogout: () => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ onLogout }) => {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [selectedTenant, setSelectedTenant] = useState<Tenant | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const [billingLoading, setBillingLoading] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [tenantList, planList] = await Promise.all([
        api.getTenants(),
        api.getPlans()
      ]);
      setTenants(tenantList);
      setPlans(planList);
      
      // Keep selected tenant synchronized if open
      if (selectedTenant) {
        const updated = tenantList.find(t => t.id === selectedTenant.id);
        if (updated) setSelectedTenant(updated);
      }
    } catch (err: any) {
      setMessage(`Error loading data: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const triggerCloseCycle = async () => {
    setBillingLoading(true);
    setMessage('');
    try {
      await api.triggerBillingCycle();
      setMessage('Billing cycles checked. Any due invoices generated successfully!');
      loadData();
      setTimeout(() => setMessage(''), 4000);
    } catch (err: any) {
      setMessage(`Billing trigger failed: ${err.message}`);
    } finally {
      setBillingLoading(false);
    }
  };

  const filteredTenants = tenants.filter(t => t.name.toLowerCase().includes(searchTerm.toLowerCase()));

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      {/* Sidebar */}
      <div style={{ width: '220px', background: 'rgba(0,0,0,0.2)', borderRight: '1px solid var(--border)', padding: '20px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
        <h1 style={{ fontSize: '20px', fontWeight: 'bold' }}>
          <span style={{ background: 'linear-gradient(135deg, var(--primary), var(--secondary))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>BillFlow</span> Panel
        </h1>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <button
            disabled={billingLoading}
            onClick={triggerCloseCycle}
            style={{
              width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--primary)',
              borderRadius: '6px', padding: '10px', color: '#fff', fontSize: '11px', fontWeight: 'bold',
              cursor: 'pointer', transition: 'all 0.2s', outline: 'none'
            }}
          >
            {billingLoading ? 'Processing...' : '⚡ Close Due Cycles'}
          </button>
        </div>
        <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Logged in as admin</div>
          <button onClick={onLogout} style={{ background: 'none', border: 'none', color: 'var(--danger)', fontSize: '12px', fontWeight: 'bold', cursor: 'pointer', textAlign: 'left' }}>Log Out</button>
        </div>
      </div>

      {/* Main Grid */}
      <div style={{ flex: 1, padding: '40px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
        {message && (
          <div style={{ background: 'rgba(168, 85, 247, 0.08)', border: '1px solid var(--primary)', color: '#e9d5ff', padding: '12px', borderRadius: '8px', fontSize: '13px' }}>
            {message}
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ fontSize: '22px', fontWeight: 'bold' }}>Tenants Control</h2>
          <input
            type="text"
            placeholder="Search tenant name..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border)',
              borderRadius: '6px', padding: '8px 12px', color: '#fff', outline: 'none', width: '250px'
            }}
          />
        </div>

        {loading && tenants.length === 0 ? (
          <div style={{ color: 'var(--text-muted)', fontSize: '14px', margin: '40px 0' }}>Loading tenants list...</div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '20px' }}>
            {filteredTenants.map(t => {
              const sub = t.subscription;
              return (
                <div
                  key={t.id}
                  className="glass-card"
                  onClick={() => setSelectedTenant(t)}
                  style={{ cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: '12px' }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <span style={{ fontWeight: 'bold', color: '#fff', fontSize: '15px' }}>{t.name}</span>
                    <span style={{
                      width: '8px', height: '8px', borderRadius: '50%',
                      background: sub?.status === 'active' ? 'var(--success)' : sub?.status === 'past_due' ? 'var(--warning)' : 'var(--danger)',
                      boxShadow: `0 0 8px ${sub?.status === 'active' ? 'var(--success)' : sub?.status === 'past_due' ? 'var(--warning)' : 'var(--danger)'}`
                    }}></span>
                  </div>
                  <div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Active Plan</div>
                    <div style={{ fontSize: '13px', color: '#fff', fontWeight: '500' }}>{sub?.plan.name || 'No Plan'}</div>
                  </div>
                  <div style={{ marginTop: '4px', fontSize: '10px', color: 'var(--text-muted)', display: 'flex', justifyContent: 'space-between' }}>
                    <span>Status:</span>
                    <span style={{ textTransform: 'uppercase', fontWeight: 'bold', color: sub?.status === 'active' ? 'var(--success)' : sub?.status === 'past_due' ? 'var(--warning)' : 'var(--danger)' }}>
                      {sub?.status || 'inactive'}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <TenantDrawer
        tenant={selectedTenant}
        plans={plans}
        onClose={() => setSelectedTenant(null)}
        onRefreshTenant={loadData}
      />
    </div>
  );
};
```

- [ ] **Step 3: Commit dashboard components**
```bash
git add frontend/src/components/Dashboard.tsx frontend/src/components/TenantDrawer.tsx
git commit -m "feat(frontend): implement unified dashboard and tenant details drawer"
```

---

### Task 7: Integrate Components in App.tsx

**Files:**
* Modify: [frontend/src/App.tsx](file:///c:/Users/91999/Desktop/BillFlow/frontend/src/App.tsx)
* Modify: [frontend/src/main.tsx](file:///c:/Users/91999/Desktop/BillFlow/frontend/src/main.tsx)

- [ ] **Step 1: Write integration code in App.tsx**
Overwrite `frontend/src/App.tsx` with:
```tsx
import { useState, useEffect } from 'react';
import { Login } from './components/Login';
import { Dashboard } from './components/Dashboard';
import { api } from './utils/api';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    const token = api.getToken();
    if (token) {
      setIsAuthenticated(true);
    }
  }, []);

  const handleLoginSuccess = () => {
    setIsAuthenticated(true);
  };

  const handleLogout = () => {
    api.logout();
    setIsAuthenticated(false);
  };

  return (
    <>
      {isAuthenticated ? (
        <Dashboard onLogout={handleLogout} />
      ) : (
        <Login onLoginSuccess={handleLoginSuccess} />
      )}
    </>
  );
}

export default App;
```

- [ ] **Step 2: Remove default imports or unused CSS from main.tsx**
View `frontend/src/main.tsx` and make sure it imports `index.css` but not other deleted components. Typically standard template is fine.

- [ ] **Step 3: Verify the build succeeds with the new components**
Run command in PowerShell:
```powershell
npm run build
```
Expected: successful build with no compilation errors.

- [ ] **Step 4: Commit App integration**
```bash
git add frontend/src/App.tsx
git commit -m "feat(frontend): integrate login and dashboard components in App.tsx"
```

---

## Plan Handoff

Plan complete and saved to [2026-08-06-admin-dashboard.md](file:///c:/Users/91999/Desktop/BillFlow/docs/superpowers/plans/2026-08-06-admin-dashboard.md). Two execution options:

1. **Subagent-Driven (recommended)** - I dispatch a fresh subagent per task, review between tasks, fast iteration.
2. **Inline Execution** - Execute tasks in this session using executing-plans, batch execution with checkpoints.

Which approach would you like to use?
