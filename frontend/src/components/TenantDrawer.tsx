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
    <div className="slide-in" style={{
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
