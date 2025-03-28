import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
  ForbiddenException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import * as jwt from 'jsonwebtoken';
import { ErrorResponse } from '../dto/error-response.dto';

interface JwtPayload {
  id: string;
  username: string;
  type: string;
  iat?: number;
  exp?: number;
}

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly configService: ConfigService,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const req: Request = context.switchToHttp().getRequest();
    const authHeader: string | undefined = req.headers.authorization;

    if (!authHeader) {
      throw new UnauthorizedException(
        new ErrorResponse(401, [
          {
            field: 'Authorization',
            message: 'Authorization token is missing.',
          },
        ]),
      );
    }

    // Extract the token from "Bearer <token>" format
    const token = authHeader.split(' ')[1];

    if (!token) {
      throw new UnauthorizedException(
        new ErrorResponse(401, [
          {
            field: 'Authorization',
            message: 'Token is missing.',
          },
        ]),
      );
    }

    const secret = this.configService.get<string>('TOKEN_SECRET');
    if (!secret) {
      throw new UnauthorizedException(
        'TOKEN_SECRET is not defined in environment variables.',
      );
    }

    try {
      const decoded = jwt.verify(token, secret) as JwtPayload;
      req['user'] = decoded; // Attach user info to request
      return true;
    } catch {
      throw new ForbiddenException({
        data: null,
        errors: [
          { field: 'Authorization', message: 'Invalid or expired token.' },
        ],
      });
    }
  }
}
