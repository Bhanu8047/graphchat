import { HttpException, HttpStatus, Injectable, NestMiddleware } from '@nestjs/common';
import { NextFunction, Request, Response } from 'express';

type RateLimitEntry = { count: number; expiresAt: number };

@Injectable()
export class AuthRateLimitMiddleware implements NestMiddleware {
  private readonly windowMs = 60_000;
  private readonly maxRequests = 12;
  private readonly store = new Map<string, RateLimitEntry>();

  use(req: Request, _res: Response, next: NextFunction) {
    const forwarded = typeof req.headers['x-forwarded-for'] === 'string' ? req.headers['x-forwarded-for'] : undefined;
    const ip = forwarded?.split(',')[0]?.trim() || req.ip || 'unknown';
    const key = `${req.path}:${ip}`;
    const now = Date.now();
    const existing = this.store.get(key);

    if (!existing || existing.expiresAt <= now) {
      this.store.set(key, { count: 1, expiresAt: now + this.windowMs });
      return next();
    }

    if (existing.count >= this.maxRequests) {
      throw new HttpException('Too many authentication attempts. Try again shortly.', HttpStatus.TOO_MANY_REQUESTS);
    }

    existing.count += 1;
    this.store.set(key, existing);
    next();
  }
}