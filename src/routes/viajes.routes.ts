import { Router } from 'express';
import { listarServicios, obtenerServicio } from '../controllers/servicios.controller';

// authMiddleware y suscripcionMiddleware ya se aplican a /api/v1 en index.ts.
const router = Router();

router.get('/',    listarServicios);  // GET /api/v1/viajes?page=&limit=&estado=
router.get('/:id', obtenerServicio);  // GET /api/v1/viajes/:id

// Decisión de oferta (aceptar/rechazar) — Sprint 3 (módulo OCR)
const stub = (_: unknown, res: { status: (n: number) => { json: (o: unknown) => void } }) =>
  res.status(501).json({ message: 'Disponible en Sprint 3' });
router.put('/:id/aceptar',  stub);
router.put('/:id/rechazar', stub);

export default router;
