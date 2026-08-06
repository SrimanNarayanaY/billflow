import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export interface RequestTenant {
  id: string;
  name: string;
  status: string;
}

export const Tenant = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): RequestTenant | undefined => {
    const request = ctx.switchToHttp().getRequest();
    return request.tenant;
  },
);
