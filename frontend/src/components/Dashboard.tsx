import React, { useState, useEffect } from 'react';
import { api, type Tenant, type Plan, type Invoice } from '../utils/api';
import { TenantDrawer } from './TenantDrawer';

interface DashboardProps {
  onLogout: () => void;
  userType?: 'admin' | 'tenant' | null;
}

export const Dashboard: React.FC<DashboardProps> = ({ onLogout, userType }) => {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [selectedTenant, setSelectedTenant] = useState<Tenant | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const [billingLoading, setBillingLoading] = useState(false);
  const [message, setMessage] = useState('');

  const [tenantProfile, setTenantProfile] = useState<Tenant | null>(null);
  const [usage, setUsage] = useState<Record<string, number>>({});
  const [invoices, setInvoices] = useState<Invoice[]>([]);

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newTenantName, setNewTenantName] = useState('');
  const [createdTenantKey, setCreatedTenantKey] = useState<string | null>(null);
  const [createLoading, setCreateLoading] = useState(false);

  const handleCreateTenant = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTenantName.trim()) return;
    setCreateLoading(true);
    try {
      const res = await api.createTenant(newTenantName);
      setCreatedTenantKey(res.apiKey);
      loadData();
    } catch (err: any) {
      setMessage(`Failed to create tenant: ${err.message}`);
    } finally {
      setCreateLoading(false);
    }
  };

  const closeCreateModal = () => {
    setShowCreateModal(false);
    setNewTenantName('');
    setCreatedTenantKey(null);
  };

  const copyApiKey = () => {
    if (createdTenantKey) {
      navigator.clipboard.writeText(createdTenantKey);
      alert('API key copied to clipboard!');
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      if (userType === 'tenant') {
        const profile = await api.getProfile();
        setTenantProfile(profile);

        const [usageData, invoiceData, planList] = await Promise.all([
          api.getOwnUsage(),
          api.getOwnInvoices(profile.id),
          api.getPlans(),
        ]);
        setUsage(usageData);
        setInvoices(invoiceData);
        setPlans(planList);
      } else {
        const [tenantList, planList] = await Promise.all([
          api.getTenants(),
          api.getPlans(),
        ]);
        setTenants(tenantList);
        setPlans(planList);

        // Keep selected tenant synchronized if open
        if (selectedTenant) {
          const updated = tenantList.find((t) => t.id === selectedTenant.id);
          if (updated) setSelectedTenant(updated);
        }
      }
    } catch (err: any) {
      setMessage(`Error loading data: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleTenantPlanChange = async (planId: string) => {
    setBillingLoading(true);
    try {
      if (tenantProfile?.subscription) {
        await api.changePlan(tenantProfile.subscription.id, planId);
        setMessage('Plan updated successfully!');
      } else {
        await api.createSubscription(planId);
        setMessage('Subscribed to plan successfully!');
      }
      loadData();
    } catch (err: any) {
      setMessage(`Failed to change plan: ${err.message}`);
    } finally {
      setBillingLoading(false);
    }
  };

  const handleTenantPayInvoice = async (invoiceId: string) => {
    setBillingLoading(true);
    try {
      await api.payInvoice(invoiceId);
      setMessage('Simulated charge triggered. Webhook delivering...');
      setTimeout(() => loadData(), 2000);
    } catch (err: any) {
      setMessage(`Payment failed: ${err.message}`);
    } finally {
      setBillingLoading(false);
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

  if (userType === 'tenant') {
    const sub = tenantProfile?.subscription;
    const apiKeyVal = localStorage.getItem('billflow_api_key') || '';

    return (
      <div style={{ display: 'flex', minHeight: '100vh' }}>
        {/* Sidebar */}
        <div style={{ width: '240px', background: 'rgba(0,0,0,0.2)', borderRight: '1px solid var(--border)', padding: '24px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <h1 style={{ fontSize: '20px', fontWeight: 'bold' }}>
            <span style={{ background: 'linear-gradient(135deg, var(--primary), var(--secondary))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>BillFlow</span> Portal
          </h1>
          <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Logged in as tenant</div>
            <div style={{ fontSize: '13px', color: '#fff', fontWeight: 'bold', wordBreak: 'break-all' }}>{tenantProfile?.name}</div>
            <button onClick={onLogout} style={{ background: 'none', border: 'none', color: 'var(--danger)', fontSize: '12px', fontWeight: 'bold', cursor: 'pointer', textAlign: 'left', outline: 'none' }}>Log Out</button>
          </div>
        </div>

        {/* Main Grid */}
        <div style={{ flex: 1, padding: '40px', display: 'flex', flexDirection: 'column', gap: '30px' }}>
          {message && (
            <div style={{ background: 'rgba(168, 85, 247, 0.08)', border: '1px solid var(--primary)', color: '#e9d5ff', padding: '12px', borderRadius: '8px', fontSize: '13px' }}>
              {message}
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h2 style={{ fontSize: '22px', fontWeight: 'bold' }}>Dashboard</h2>
            <span style={{
              background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border)',
              borderRadius: '20px', padding: '4px 12px', fontSize: '12px', color: 'var(--text-muted)'
            }}>
              ID: {tenantProfile?.id}
            </span>
          </div>

          {loading && !tenantProfile ? (
            <div style={{ color: 'var(--text-muted)', fontSize: '14px', margin: '40px 0' }}>Loading your profile...</div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '30px', alignItems: 'start' }}>
              {/* Left Column: Sub & Usage */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                {/* Subscription Status Card */}
                <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <h3 style={{ fontSize: '15px', fontWeight: 'bold', color: '#fff', margin: 0 }}>Subscription Details</h3>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ color: 'var(--text-muted)', fontSize: '13px' }}>Status</span>
                    <span style={{
                      color: sub?.status === 'active' ? 'var(--success)' : sub?.status === 'past_due' ? 'var(--warning)' : sub?.status === 'suspended' ? 'var(--danger)' : 'var(--text-muted)',
                      fontWeight: 'bold', textTransform: 'capitalize', fontSize: '13px'
                    }}>{sub?.status || 'No Active Subscription'}</span>
                  </div>
                  {sub && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: 'var(--text-muted)' }}>
                      <span>Current Period</span>
                      <span>{new Date(sub.currentPeriodStart).toLocaleDateString()} to {new Date(sub.currentPeriodEnd).toLocaleDateString()}</span>
                    </div>
                  )}
                </div>

                {/* Usage Limits Card */}
                <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <h3 style={{ fontSize: '15px', fontWeight: 'bold', color: '#fff', margin: 0 }}>Current Plan Usage</h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {sub ? (
                      Object.entries(sub.plan.usageLimits).map(([metric, limit]) => {
                        const used = usage[metric] || 0;
                        const pct = Math.min((used / limit) * 100, 100);
                        return (
                          <div key={metric} style={{ background: 'rgba(255,255,255,0.02)', padding: '12px', borderRadius: '6px', border: '1px solid var(--border)' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '6px' }}>
                              <span style={{ textTransform: 'capitalize' }}>{metric.replace('_', ' ')}</span>
                              <span>{used} / {limit}</span>
                            </div>
                            <div style={{ width: '100%', height: '8px', background: 'rgba(255,255,255,0.05)', borderRadius: '4px', overflow: 'hidden' }}>
                              <div style={{ width: `${pct}%`, height: '100%', background: 'linear-gradient(90deg, var(--primary), var(--secondary))', borderRadius: '4px' }}></div>
                            </div>
                          </div>
                        );
                      })
                    ) : <div style={{ color: 'var(--text-muted)', fontSize: '13px' }}>Subscribe to a plan to see active usage limits</div>}
                  </div>
                </div>

                {/* Change Plan Selector */}
                <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <h3 style={{ fontSize: '15px', fontWeight: 'bold', color: '#fff', margin: 0 }}>Change Plan / Subscribe</h3>
                  <select
                    disabled={billingLoading}
                    value={sub?.plan.id || ''}
                    onChange={(e) => handleTenantPlanChange(e.target.value)}
                    style={{
                      width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border)',
                      borderRadius: '6px', padding: '12px', color: '#fff', outline: 'none', cursor: 'pointer'
                    }}
                  >
                    <option value="" disabled style={{ background: '#121620' }}>-- Select a Plan --</option>
                    {plans.map(p => <option key={p.id} value={p.id} style={{ background: '#121620' }}>{p.name} - ${(p.price / 100).toFixed(2)}/mo</option>)}
                  </select>
                </div>
              </div>

              {/* Right Column: Invoices & API Key */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                {/* Invoices Card */}
                <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <h3 style={{ fontSize: '15px', fontWeight: 'bold', color: '#fff', margin: 0 }}>Invoices</h3>
                  <div style={{ border: '1px solid var(--border)', borderRadius: '6px', overflow: 'hidden' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', textAlign: 'left' }}>
                      <thead>
                        <tr style={{ background: 'rgba(255,255,255,0.03)', borderBottom: '1px solid var(--border)' }}>
                          <th style={{ padding: '10px' }}>Period</th>
                          <th style={{ padding: '10px' }}>Amount</th>
                          <th style={{ padding: '10px' }}>Status</th>
                          <th style={{ padding: '10px' }}>Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {invoices.length > 0 ? (
                          invoices.map(inv => (
                            <tr key={inv.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                              <td style={{ padding: '10px', opacity: 0.8 }}>{inv.periodStart.slice(0,10)} to {inv.periodEnd.slice(0,10)}</td>
                              <td style={{ padding: '10px' }}>${(inv.totalAmount / 100).toFixed(2)}</td>
                              <td style={{ padding: '10px' }}>
                                <span style={{
                                  color: inv.status === 'paid' ? 'var(--success)' : inv.status === 'open' ? 'var(--warning)' : 'var(--danger)',
                                  fontWeight: 'bold'
                                }}>{inv.status}</span>
                              </td>
                              <td style={{ padding: '10px' }}>
                                {inv.status === 'open' && (
                                  <button
                                    disabled={billingLoading}
                                    onClick={() => handleTenantPayInvoice(inv.id)}
                                    style={{ background: 'var(--success)', border: 'none', borderRadius: '4px', padding: '4px 10px', color: '#fff', cursor: 'pointer', fontSize: '10px', fontWeight: 'bold', outline: 'none' }}
                                  >Pay</button>
                                )}
                              </td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan={4} style={{ padding: '16px', textAlign: 'center', color: 'var(--text-muted)' }}>No invoices generated yet</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* API Key Box */}
                <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <h3 style={{ fontSize: '15px', fontWeight: 'bold', color: '#fff', margin: 0 }}>API Key Credentials</h3>
                  <div style={{ display: 'flex', gap: '8px', background: 'rgba(0,0,0,0.2)', padding: '12px', borderRadius: '6px', border: '1px solid var(--border)', alignItems: 'center' }}>
                    <code style={{ flex: 1, fontSize: '11px', color: '#fff', wordBreak: 'break-all' }}>{apiKeyVal}</code>
                    <button
                      onClick={() => { navigator.clipboard.writeText(apiKeyVal); alert('API Key copied!'); }}
                      style={{ background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: '4px', padding: '6px 10px', color: '#fff', fontSize: '11px', cursor: 'pointer', fontWeight: 'bold' }}
                    >Copy</button>
                  </div>
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                    Use this key in your application server requests via the <code>x-api-key</code> header to authenticate with BillFlow.
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  const filteredTenants = tenants.filter(t => t.name.toLowerCase().includes(searchTerm.toLowerCase()));

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      {/* Sidebar */}
      <div style={{ width: '240px', background: 'rgba(0,0,0,0.2)', borderRight: '1px solid var(--border)', padding: '24px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
        <h1 style={{ fontSize: '20px', fontWeight: 'bold' }}>
          <span style={{ background: 'linear-gradient(135deg, var(--primary), var(--secondary))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>BillFlow</span> Panel
        </h1>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <button
            disabled={billingLoading}
            onClick={triggerCloseCycle}
            style={{
              width: '100%', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--primary)',
              borderRadius: '6px', padding: '12px', color: '#fff', fontSize: '12px', fontWeight: 'bold',
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
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <h2 style={{ fontSize: '22px', fontWeight: 'bold', margin: 0 }}>Tenants Control</h2>
            <button
              onClick={() => setShowCreateModal(true)}
              style={{
                background: 'linear-gradient(90deg, var(--primary), var(--secondary))',
                border: 'none',
                borderRadius: '6px',
                padding: '8px 16px',
                color: '#fff',
                fontSize: '13px',
                fontWeight: 'bold',
                cursor: 'pointer',
                outline: 'none',
                boxShadow: '0 0 10px rgba(168, 85, 247, 0.3)',
                transition: 'opacity 0.2s',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.opacity = '0.85')}
              onMouseLeave={(e) => (e.currentTarget.style.opacity = '1')}
            >
              + Create Tenant
            </button>
          </div>
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

      {/* Create Tenant Modal */}
      {showCreateModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
          background: 'rgba(0, 0, 0, 0.65)', backdropFilter: 'blur(8px)',
          display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000
        }}>
          <div className="glass-card" style={{
            width: '100%', maxWidth: '450px', padding: '30px', display: 'flex',
            flexDirection: 'column', gap: '20px', border: '1px solid var(--border)',
            boxShadow: '0 10px 30px rgba(0, 0, 0, 0.5)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ fontSize: '18px', fontWeight: 'bold', margin: 0, color: '#fff' }}>Create New Tenant</h3>
              <button onClick={closeCreateModal} style={{ background: 'none', border: 'none', color: '#fff', fontSize: '18px', cursor: 'pointer' }}>✕</button>
            </div>

            {!createdTenantKey ? (
              <form onSubmit={handleCreateTenant} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <label style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Tenant Name</label>
                  <input
                    type="text"
                    required
                    value={newTenantName}
                    onChange={(e) => setNewTenantName(e.target.value)}
                    placeholder="e.g., SpaceX"
                    style={{
                      width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border)',
                      borderRadius: '6px', padding: '10px', color: '#fff', outline: 'none'
                    }}
                  />
                </div>
                <button
                  type="submit"
                  disabled={createLoading}
                  style={{
                    width: '100%', background: 'linear-gradient(90deg, var(--primary), var(--secondary))',
                    border: 'none', borderRadius: '6px', padding: '12px', color: '#fff',
                    fontWeight: 'bold', cursor: 'pointer', outline: 'none', marginTop: '10px'
                  }}
                >
                  {createLoading ? 'Creating...' : 'Register Tenant'}
                </button>
              </form>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{
                  background: 'var(--success-glow)', border: '1px solid var(--success)',
                  color: '#8fff8f', padding: '12px', borderRadius: '6px', fontSize: '13px', textAlign: 'center'
                }}>
                  Tenant registered successfully!
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Tenant API Key (Copy this now!):</label>
                  <div style={{
                    display: 'flex', gap: '8px', background: 'rgba(0,0,0,0.2)',
                    padding: '10px', borderRadius: '6px', border: '1px solid var(--border)',
                    alignItems: 'center'
                  }}>
                    <code style={{ flex: 1, fontSize: '12px', color: '#fff', wordBreak: 'break-all' }}>{createdTenantKey}</code>
                    <button
                      onClick={copyApiKey}
                      style={{
                        background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: '4px',
                        padding: '6px 10px', color: '#fff', fontSize: '11px', cursor: 'pointer',
                        fontWeight: 'bold', whiteSpace: 'nowrap'
                      }}
                    >
                      Copy
                    </button>
                  </div>
                  <span style={{ fontSize: '11px', color: 'var(--danger)', marginTop: '4px', fontWeight: 'bold' }}>
                    ⚠️ Warning: This key is only shown once and cannot be retrieved later.
                  </span>
                </div>
                <button
                  onClick={closeCreateModal}
                  style={{
                    width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border)',
                    borderRadius: '6px', padding: '10px', color: '#fff', cursor: 'pointer', outline: 'none'
                  }}
                >
                  Close
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
