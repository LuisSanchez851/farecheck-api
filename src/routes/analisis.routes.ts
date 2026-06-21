import { Router } from 'express';
import { analizarOferta, registrarDecision } from '../controllers/analisis.controller';

// authMiddleware y suscripcionMiddleware ya se aplican a /api/v1 en index.ts.
// El rate limit específico de /analisis se monta en index.ts (endpoint de alta frecuencia).
const router = Router();

// POST /api/v1/analisis — el endpoint más crítico del producto (Sprint 3)
router.post('/', analizarOferta);

// PATCH /api/v1/analisis/:viaje_id/decision — registra si el conductor aceptó/rechazó
router.patch('/:viaje_id/decision', registrarDecision);

export default router;
