import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  getInfo() {
    return {
      service: 'BillFlow API',
      description: 'Multi-tenant subscription billing engine',
      version: '1.0.0',
      endpoints: [
        'POST /api/tenants',
        'POST /api/auth/login',
        'POST /api/usage/events',
        'POST /api/webhooks/razorpay',
        'POST /api/invoices/generate-due',
      ],
    };
  }
}
