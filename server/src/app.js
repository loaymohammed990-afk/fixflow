import express from 'express';
import cors from 'cors';
import swaggerUi from 'swagger-ui-express';
import YAML from 'yaml';
import { readFileSync } from 'node:fs';
import { config } from './config/env.js';
import { orders } from './routes/order.routes.js';
import { dashboard } from './routes/dashboard.routes.js';
import { ApiError, errorHandler, requireDatabase } from './middleware/errorHandler.js';
import { success } from './utils/orderDto.js';
export function createApp() {
  const app = express();
  const apiOrigin = `http://${config.host === '::1' ? '[::1]' : config.host}:${config.port}`;
  app.disable('x-powered-by');
  app.use(cors({ origin(origin, callback) {
    if (!origin || origin === apiOrigin || config.origins.includes(origin)) callback(null, true);
    else callback(new ApiError(403, 'ORIGIN_NOT_ALLOWED', 'مصدر الطلب غير مسموح'));
  } }));
  app.use((req, res, next) => {
    if (['POST', 'PATCH'].includes(req.method) && !req.is('application/json')) return next(new ApiError(415, 'VALIDATION_ERROR', 'استخدم application/json'));
    next();
  });
  app.use(express.json({ limit: '100kb' }));
  app.get('/api/v1/health', requireDatabase, (req, res) => success(res, { service: 'FixFlow API', database: 'connected' }));
  app.use('/api/v1/orders', requireDatabase, orders);
  app.use('/api/v1/dashboard', requireDatabase, dashboard);
  if (config.development) {
    const document = YAML.parse(readFileSync(new URL('../docs/openapi.yaml', import.meta.url), 'utf8'));
    app.get('/api-docs/openapi.yaml', (req, res) => res.type('application/yaml').send(readFileSync(new URL('../docs/openapi.yaml', import.meta.url), 'utf8')));
    app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(document));
  }
  app.use((req, res, next) => next(new ApiError(404, 'NOT_FOUND', 'المسار غير موجود')));
  app.use(errorHandler);
  return app;
}
