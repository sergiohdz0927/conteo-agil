import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { JwtPayload } from '../types.js';

export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): JwtPayload =>
    ctx.switchToHttp().getRequest<{ user: JwtPayload }>().user,
);