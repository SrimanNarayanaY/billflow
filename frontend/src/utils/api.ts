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
