import { Router } from 'express';
import { getHistorial, getViaje } from '../controllers/viajes.controller';

// authMiddleware y suscripcionMiddleware ya se aplican a /api/v1 en index.ts.
const router = Router();

router.get('/',    getHistorial); // GET /api/v1/viajes?page=&limit=&estado=
router.get('/:id', getViaje);     // GET /api/v1/viajes/:id

// Decisión de oferta (aceptar/rechazar) — Sprint 3 (módulo OCR)
const stub = (_: unknown, res: { status: (n: number) => { json: (o: unknown) => void } }) =>
  res.status(501).json({ message: 'Disponible en Sprint 3' });
router.put('/:id/aceptar',  stub);
router.put('/:id/rechazar', stub);

export default router;
