import React, { useState, useEffect } from 'react';
import { api, type Tenant, type Plan } from '../utils/api';
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
