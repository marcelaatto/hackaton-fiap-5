const express = require('express');
const { register } = require('prom-client');
const { AppError } = require('@hackaton/shared');

const app = express();

// ─── Middlewares globais ────────────────────────────────────────────────────
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));

// ─── Health Check ───────────────────────────────────────────────────────────
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'api', timestamp: new Date().toISOString() });
});

// ─── Métricas Prometheus ────────────────────────────────────────────────────
app.get('/metrics', async (_req, res) => {
  res.set('Content-Type', register.contentType);
  res.end(await register.metrics());
});

// ─── Rotas de negócio ───────────────────────────────────────────────────────
app.use('/auth', require('./routes/authRoutes'));
app.use('/videos', require('./routes/videoRoutes'));

// ─── 404 ────────────────────────────────────────────────────────────────────
app.use((_req, _res, next) => {
  next(new AppError('Rota não encontrada', 404, 'NOT_FOUND'));
});

// ─── Error Handler global ───────────────────────────────────────────────────
// eslint-disable-next-line no-unused-vars
app.use((err, _req, res, _next) => {
  const statusCode = err.isOperational ? err.statusCode : 500;
  const code = err.code || 'INTERNAL_ERROR';
  const message = err.isOperational ? err.message : 'Erro interno do servidor';

  res.status(statusCode).json({ error: { code, message } });
});

module.exports = app;
