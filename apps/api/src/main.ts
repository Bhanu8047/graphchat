import 'reflect-metadata';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from './app/app.module';

function parseAllowedOrigins(): string[] {
  const raw = process.env.WEB_URL ?? 'http://localhost:3000';
  return raw
    .split(',')
    .map((value) => value.trim().replace(/\/$/, ''))
    .filter(Boolean);
}

async function bootstrap() {
  // Client-extracted graph ingest payloads can be tens of MB on large repos.
  // Default 100kb is too small; cap at 50MB to avoid trivial DoS via huge bodies.
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    bodyParser: true,
    rawBody: false,
  });
  app.useBodyParser('json', { limit: '50mb' });
  app.useBodyParser('urlencoded', { limit: '50mb', extended: true });
  // Required so secure cookies, rate limiting, and X-Forwarded-* work
  // correctly behind nginx/Cloudflare.
  app.set('trust proxy', 1);
  app.use(
    helmet({
      // The API serves JSON only; CSP is enforced by the web app, not here.
      contentSecurityPolicy: false,
      crossOriginResourcePolicy: { policy: 'same-site' },
    }),
  );
  app.use(cookieParser());
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  const allowedOrigins = parseAllowedOrigins();
  app.enableCors({
    origin: (origin, callback) => {
      // Same-origin and non-browser callers (no Origin header) are allowed
      // through. Browser cross-origin requests must come from the allowlist.
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
        return;
      }
      callback(new Error('Origin not allowed by CORS policy'), false);
    },
    credentials: true,
  });
  app.setGlobalPrefix('api');
  await app.listen(3001);
}
bootstrap();
