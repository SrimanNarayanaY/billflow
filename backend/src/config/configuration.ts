export default () => ({
  port: parseInt(process.env.PORT ?? '3000', 10),
  baseUrl: process.env.BASE_URL ?? 'http://localhost:3000',
  database: {
    host: process.env.PGHOST ?? 'localhost',
    port: parseInt(process.env.PGPORT ?? '5432', 10),
    username: process.env.PGUSER ?? 'billflow',
    password: process.env.PGPASSWORD ?? 'billflow',
    database: process.env.PGDATABASE ?? 'billflow',
  },
  redis: {
    host: process.env.REDIS_HOST ?? 'localhost',
    port: parseInt(process.env.REDIS_PORT ?? '6379', 10),
  },
  jwtSecret: process.env.JWT_SECRET ?? 'billflow-dev-secret-change-me',
  admin: {
    email: process.env.ADMIN_EMAIL ?? 'admin@billflow.dev',
    password: process.env.ADMIN_PASSWORD ?? 'admin123',
  },
  razorpay: {
    webhookSecret: process.env.RAZORPAY_WEBHOOK_SECRET ?? 'billflow-razorpay-dev-secret',
  },
  demoApiKey: process.env.DEMO_API_KEY ?? 'billflow_demo_key',
  dunning: {
    retryDays: [3, 7],
    suspendDay: 10,
    delays: process.env.DUNNING_DELAYS,
  },
  paymentSimDelayMs: parseInt(process.env.PAYMENT_SIM_DELAY_MS ?? '5000', 10),
  cycleCloseIntervalMs: parseInt(process.env.CYCLE_CLOSE_INTERVAL_MS ?? '30000', 10),
});
