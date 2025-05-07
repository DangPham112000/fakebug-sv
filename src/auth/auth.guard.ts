import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { Request } from 'express';
import { IS_PUBLIC_KEY } from './decorators/public.decorator';
import { AuthService } from './auth.service';

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private jwtService: JwtService,
    private reflector: Reflector,
    private authService: AuthService,
  ) {}

  private extractTokenFromHeader(request: Request): string | undefined {
    const [type, token] = request.headers.authorization?.split(' ') ?? [];
    return type === 'Bearer' ? token : undefined;
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const token = this.extractTokenFromHeader(request);
    if (!token) {
      throw new UnauthorizedException('Unauthorized', {
        cause: new Error(),
        description: 'Token is not provided',
      });
    }

    try {
      const decoded = this.jwtService.decode(token);
      if (!decoded || !decoded.sub) {
        throw new UnauthorizedException('Unauthorized', {
          cause: new Error(),
          description: 'Invalid token format',
        });
      }

      const account = await this.authService.findOneById({
        id: decoded.sub,
      });
      if (!account || !account.tokenSecret) {
        throw new UnauthorizedException('Unauthorized', {
          cause: new Error(),
          description: 'Account not found or token revoked',
        });
      }

      const tokenPayload = await this.jwtService.verifyAsync(token, {
        secret: account.tokenSecret,
      });

      request['account'] = tokenPayload;
    } catch (error) {
      throw new UnauthorizedException('Unauthorized', {
        cause: new Error(),
        description: 'Error when verifying token',
      });
    }

    return true;
  }
}
