import { Router } from 'express';
import {
  listarServicios,
  obtenerServicio,
  crearServicio,
  actualizarDecision,
} from '../controllers/servicios.controller';

// authMiddleware y suscripcionMiddleware ya se aplican a /api/v1 en index.ts.
const router = Router();

router.get('/',    listarServicios);  // GET    /api/v1/servicios?page=&limit=&estado=
router.get('/:id', obtenerServicio);  // GET    /api/v1/servicios/:id
router.post('/',   crearServicio);    // POST   /api/v1/servicios

// Decisión del conductor (aceptar/rechazar el servicio evaluado).
router.patch('/:id/decision', actualizarDecision); // PATCH /api/v1/servicios/:id/decision

export default router;
