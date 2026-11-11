import {
  ClassSerializerInterceptor,
  ValidationPipe,
  type INestApplication,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Reflector } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor.js';
import type { EnvironmentVariables } from './config/env.validation.js';

/**
 * Configuração compartilhada entre main.ts e os testes e2e, para que os
 * testes exercitem exatamente o mesmo pipeline da aplicação real.
 */
export function configureApp(app: INestApplication): INestApplication {
  const config = app.get(ConfigService<EnvironmentVariables, true>);

  app.use(helmet());
  app.enableCors({
    origin: config.get('WEB_URL', { infer: true }),
    credentials: true,
  });
  app.setGlobalPrefix('api', { exclude: ['health'] });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  app.useGlobalInterceptors(
    new ClassSerializerInterceptor(app.get(Reflector)),
    new LoggingInterceptor(),
  );
  app.enableShutdownHooks();

  const document = SwaggerModule.createDocument(
    app,
    new DocumentBuilder()
      .setTitle('Fullstack Template API')
      .setDescription('NestJS + TypeORM + PostgreSQL + JWT')
      .setVersion('1.0.0')
      .addBearerAuth()
      .build(),
  );
  SwaggerModule.setup('docs', app, document);

  return app;
}
