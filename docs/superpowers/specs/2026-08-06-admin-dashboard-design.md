# Spec: BillFlow Admin Dashboard & Dunning Fix Design

**Topic**: Admin Dashboard UI (React + Vite + TypeScript) and Dunning State Machine Fix  
**Date**: 2026-08-06  
**Status**: Pending Review  

---

## 1. Goal Description

This specification outlines the technical design for:
1. **Dunning State Machine Fix**: Fixing a critical logic bug in the NestJS backend where failed payment retries do not advance the dunning stages (`retry_1` -> `retry_2` -> `suspend`) because the webhook handler blocks processing on any subscription that is not strictly in the `'active'` state.
2. **React Admin Dashboard**: Building a high-end, premium administrative UI inside `/frontend` using React 18, Vite, TypeScript, and Vanilla CSS with a **Neon Glassmorphism Dark Mode** theme. It will provide real-time usage visualizations, billing cycle manual triggers, subscription plan switches, invoice histories, and a simulation panel to test payment successes and failure transitions live.

---

## 2. Technical Design

### 2.1 Backend Dunning Bug Fix
In the existing backend, when a payment attempt fails, the simulator delivers a `payment.failed` webhook. In [webhooks.service.ts](file:///c:/Users/91999/Desktop/BillFlow/backend/src/webhooks/webhooks.service.ts), the handler prevents dunning stage progression on line 122:

```typescript
// Current Code
const subscription = await this.subscriptionsService.findByTenant(invoice.tenantId);
if (subscription && subscription.status === 'active') {
  await this.dunningService.handlePaymentFailed(subscription.id, reason);
}
```

* **The Problem**: After the *first* payment failure, the dunning service sets `subscription.status` to `'past_due'` and `dunningStage` to `'retry_1'`. When the scheduled `retry_1` job executes and fails again, the webhook runs, but `subscription.status` is now `'past_due'`. The webhook handler ignores the failure, and the state machine stalls at `retry_1` indefinitely instead of moving to `retry_2` and `suspend`.
* **The Fix**: Expand the condition to allow processing when the subscription status is `'past_due'`:
```typescript
if (subscription && (subscription.status === 'active' || subscription.status === 'past_due')) {
  await this.dunningService.handlePaymentFailed(subscription.id, reason);
}
```

---

### 2.2 Frontend React Admin Dashboard
The frontend will be built inside [frontend/](file:///c:/Users/91999/Desktop/BillFlow/frontend/) in the workspace root.

#### Tech Stack
* **Vite + React 18 + TypeScript** (non-interactive npx scaffold)
* **Vanilla CSS**: Premium dark mode stylesheet using backdrop-filter blur effects, glowing border cards, purple-blue neon gradients, and CSS variables.
* **State Management**: Simple React hooks (`useState`, `useEffect`) and a custom Auth Context for JWT storage.

#### File Structure
```
frontend/
├── index.html
├── package.json
├── src/
│   ├── main.tsx
│   ├── App.tsx
│   ├── index.css
│   ├── components/
│   │   ├── Login.tsx          (Admin login credentials form)
│   │   ├── Dashboard.tsx      (Main panel with sidebar, search, and tenant list)
│   │   └── TenantDrawer.tsx   (Right slide-out detail & simulation console)
│   └── utils/
│       └── api.ts             (Typed fetch clients with bearer auth & key routing)
```

#### CSS Theme & Variables (index.css)
```css
:root {
  --bg-main: #070b13;
  --bg-card: rgba(255, 255, 255, 0.03);
  --border: rgba(255, 255, 255, 0.08);
  --border-glow: rgba(168, 85, 247, 0.2);
  --primary: #a855f7;
  --primary-glow: rgba(168, 85, 247, 0.4);
  --secondary: #3b82f6;
  --text-main: #f8fafc;
  --text-muted: #94a3b8;
  
  --success: #10b981;
  --warning: #f59e0b;
  --danger: #ef4444;
}

body {
  background-color: var(--bg-main);
  color: var(--text-main);
  font-family: 'Outfit', 'Inter', sans-serif;
  margin: 0;
}
```

#### API Integration Routes
All dashboard client requests will point to `http://localhost:3000/api` with the JWT token in the `Authorization: Bearer <token>` header:
* `/auth/login` - Authenticate admin credentials and return JWT.
* `/tenants` - Fetch all tenant accounts.
* `/plans` - Get pricing plans list (Free, Pro, Business).
* `/invoices/generate-due` - Post request to run manual billing cycle close.
* `/usage/:tenantId/current` - Real-time metrics from Redis/Postgres.
* `/invoices/:tenantId` - Invoices matching tenant.
* `/subscriptions/:id/change-plan` - Patch route to upgrade/downgrade subscription and compute proration.
* `/invoices/:id/pay` - Post route to trigger simulator payment attempt.
* `/dunning/:tenantId/simulate-failure` - Force payment fail and advance dunning stages.
* `/dunning/:tenantId/status` - Read retry stages, delays, and schedule.

---

## 3. Mockup & Layout Visuals

The layout uses **Option A: Unified Slide-out Panel Layout** in a beautiful Glassmorphism theme:
* Left Sidebar: Logo, Current Admin identity, "Force Billing Cycle Close" trigger.
* Main Content: Searchable grid of Tenant Cards showing basic status (`Active` in emerald, `Past Due` in amber, `Suspended` in crimson) and their current plan.
* Right Drawer: Slides in from the right upon tenant click. It features high-density tabs/sections containing:
  * **Real-time Usage Progress Bars**: Graphical meters representing API Calls, Storage, and Seats consumption against limits.
  * **Plan Actions**: Dropdown to change the subscription plan, displaying warning hints about computed proration logic.
  * **Invoices & Payment Attempts**: Nested table listing cycles, amounts, and statuses, with a "Pay" action for open invoices.
  * **Dunning Controller**: A manual fail-tester to watch the retry cycle execute.

---

## 4. Verification Plan

### 4.1 Backend Verification
* **Dunning Unit/Integration Test**: Write a test or manually check that triggering subsequent failures through the API key/webhook pipeline updates `dunningStage` sequentially (`retry_1` -> `retry_2` -> `suspend` -> `suspended`).
* **Signature/Idempotency Check**: Confirm duplicate events are rejected with a `duplicate` status and do not write duplicate database logs.

### 4.2 Frontend Verification
* Run frontend via `npm run dev` and navigate to the dashboard.
* Verify user can login, load tenants, select a tenant, trigger a plan change, pay an invoice, and observe the dunning status transition live on the UI.
