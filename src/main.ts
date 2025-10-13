import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { join } from 'path';
import * as express from 'express';
import { Logger } from '@nestjs/common';

async function bootstrap() {
  const logger = new Logger('Bootstrap');

  const app = await NestFactory.create(AppModule, { cors: true });

  app.use('/uploads', express.static(join(process.cwd(), 'uploads')));

  app.use((req, res, next) => {
    if (req.url.includes('/socket.io/')) {
      logger.log(`🔌 Socket.IO request: ${req.method} ${req.url}`);
      logger.log(`   - Origin: ${req.headers.origin}`);
      logger.log(`   - User-Agent: ${req.headers['user-agent']}`);
    }
    next();
  });

  const port = 3000;
  const host = '0.0.0.0';

  await app.listen(port, host);

  logger.log(`🚀 Server is running on http://${host}:${port}`);
  logger.log(`🔌 WebSocket Gateway is ready at /socket.io/`);
  logger.log(`📁 Static files served from /uploads`);
}

bootstrap().catch((error) => {
  console.error('❌ Error starting server:', error);
});
