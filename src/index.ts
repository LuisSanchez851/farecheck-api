import 'dotenv/config'; // Carga .env antes de todo lo demás
import express, { Request, Response, NextFunction } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import rateLimit from 'express-rate-limit';

import authRoutes       from './routes/auth.routes';
import conductorRoutes  from './routes/conductor.routes';
import turnosRoutes     from './routes/turnos.routes';
import viajesRoutes     from './routes/viajes.routes';
import analisisRoutes   from './routes/analisis.routes';
import balanceRoutes    from './routes/balance.routes';
import suscripcionRoutes from './routes/suscripcion.routes';

import { authMiddleware }        from './middleware/auth.middleware';
import { suscripcionMiddleware } from './middleware/suscripcion.middleware';
import { logger }                from './utils/logger';

const app  = express();
const PORT = process.env.PORT ?? 3000;

// ── Seguridad ──────────────────────────────────────────────────────────────────
app.use(helmet());
app.use(cors({
  origin: process.env.NODE_ENV === 'production'
    ? (process.env.CORS_ORIGIN ?? 'https://farecheck.app')
    : '*',
}));

// ── Rate limiting global ───────────────────────────────────────────────────────
const globalLimiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS ?? '900000'),
  max:      parseInt(process.env.RATE_LIMIT_MAX ?? '100'),
  message:  { error: 'rate_limit_exceeded', message: 'Demasiadas solicitudes. Intenta en 15 minutos.' },
  standardHeaders: true,
  legacyHeaders:   false,
});
app.use(globalLimiter);

// Rate limit específico para /analisis — endpoint más frecuente durante el turno
const analisisLimiter = rateLimit({
  windowMs: 60_000,
  max:      parseInt(process.env.ANALISIS_RATE_LIMIT_MAX ?? '200'),
  message:  { error: 'rate_limit_exceeded', message: 'Límite de análisis alcanzado. Espera 1 minuto.' },
});

// ── Parseo de body ─────────────────────────────────────────────────────────────
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));

// ── Health check ───────────────────────────────────────────────────────────────
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString(), version: '1.0.0' });
});

// ── Rutas PÚBLICAS (sin JWT) ───────────────────────────────────────────────────
app.use('/api/v1/auth', authRoutes);

// Stripe webhook requiere body crudo para verificar firma — sin JWT
app.post(
  '/api/v1/suscripcion/webhook',
  express.raw({ type: 'application/json' }),
  (_req, res) => res.status(501).json({ message: 'Webhook Stripe disponible en Sprint 4' }),
);

// ── Autenticación (aplica a todo lo que sigue) ─────────────────────────────────
app.use('/api/v1', authMiddleware);

// ── Suscripción (autenticado, sin verificar plan activo — para poder suscribirse) ──
app.use('/api/v1/suscripcion', suscripcionRoutes);

// ── Verificación de suscripción activa (aplica al resto de rutas privadas) ─────
app.use('/api/v1', suscripcionMiddleware);

// ── Rutas privadas ─────────────────────────────────────────────────────────────
app.use('/api/v1/conductor', conductorRoutes);
app.use('/api/v1/turnos',    turnosRoutes);
app.use('/api/v1/viajes',    viajesRoutes);
app.use('/api/v1/analisis',  analisisLimiter, analisisRoutes);
app.use('/api/v1/balance',   balanceRoutes);

// ── 404 ───────────────────────────────────────────────────────────────────────
app.use('*', (req, res) => {
  res.status(404).json({ error: 'ruta_no_encontrada', message: `${req.method} ${req.originalUrl} no existe.` });
});

// ── Error handler global ──────────────────────────────────────────────────────
// eslint-disable-next-line @typescript-eslint/no-unused-vars
app.use((err: Error & { status?: number }, _req: Request, res: Response, _next: NextFunction) => {
  logger.error(`Error no manejado: ${err.message}`, { stack: err.stack });
  res.status(err.status ?? 500).json({
    error:   'error_interno',
    message: process.env.NODE_ENV === 'production'
      ? 'Ocurrió un error. Intenta de nuevo.'
      : err.message,
  });
});

// ── Iniciar servidor ──────────────────────────────────────────────────────────
// Solo escucha cuando se ejecuta directamente (no al importarse en tests con supertest)
if (require.main === module) {
  app.listen(PORT, () => {
    logger.info(`✅ FareCheck API → puerto ${PORT} — ${process.env.NODE_ENV ?? 'development'}`);
  });
}

export default app;
