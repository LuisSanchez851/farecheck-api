import { Router } from 'express';
import { getBalanceDia, getBalanceSemana } from '../controllers/balance.controller';

// authMiddleware y suscripcionMiddleware ya se aplican a /api/v1 en index.ts.
const router = Router();

router.get('/dia',    getBalanceDia);     // GET /api/v1/balance/dia
router.get('/semana', getBalanceSemana);  // GET /api/v1/balance/semana

// GET /api/v1/balance/mes — pendiente (no requerido por S2-08)
router.get('/mes', (_req, res) => res.status(501).json({ message: 'Disponible en un sprint posterior' }));

export default router;
