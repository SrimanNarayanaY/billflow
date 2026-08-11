export default () => {
  let redisHost = process.env.REDIS_HOST ?? 'localhost';
  let redisPort = parseInt(process.env.REDIS_PORT ?? '6379', 10);
  let redisUsername: string | undefined = undefined;
  let redisPassword: string | undefined = undefined;
  let redisTls: any = undefined;

  if (process.env.REDIS_URL) {
    try {
      const parsed = new URL(process.env.REDIS_URL);
      redisHost = parsed.hostname;
      redisPort = parseInt(parsed.port || '6379', 10);
      redisUsername = parsed.username ? decodeURIComponent(parsed.username) : undefined;
      redisPassword = parsed.password ? decodeURIComponent(parsed.password) : undefined;
      if (parsed.protocol === 'rediss:') {
        redisTls = { rejectUnauthorized: false };
      }
    } catch (err) {
      console.error('Failed to parse REDIS_URL', err);
    }
  }

  return {
    port: parseInt(process.env.PORT ?? '3000', 10),
    baseUrl: process.env.BASE_URL ?? 'http://localhost:3000',
    database: {
      host: process.env.PGHOST ?? 'localhost',
      port: parseInt(process.env.PGPORT ?? '5432', 10),
      username: process.env.PGUSER ?? 'billflow',
      password: process.env.PGPASSWORD ?? 'billflow',
      database: process.env.PGDATABASE ?? 'billflow',
      ssl: process.env.PGSSL === 'true' || (!!process.env.PGHOST && !process.env.PGHOST.includes('localhost') && !process.env.PGHOST.includes('127.0.0.1')),
    },
    redis: {
      host: redisHost,
      port: redisPort,
      username: redisUsername,
      password: redisPassword,
      tls: redisTls,
      url: process.env.REDIS_URL,
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
  };
};

