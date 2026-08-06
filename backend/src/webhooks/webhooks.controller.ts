import { Body, Controller, Headers, Post, Req } from '@nestjs/common';
import { Request } from 'express';
import { WebhooksService } from './webhooks.service';

type RawRequest = Request & { rawBody?: Buffer };

@Controller('webhooks')
export class WebhooksController {
  constructor(private readonly webhooksService: WebhooksService) {}

  @Post('razorpay')
  razorpay(
    @Req() request: RawRequest,
    @Headers('x-razorpay-signature') signature: string | undefined,
    @Body() body: unknown,
  ) {
    const rawBody = request.rawBody?.toString('utf8') ?? JSON.stringify(body);
    return this.webhooksService.verifyAndProcess(rawBody, signature, body);
  }
}
