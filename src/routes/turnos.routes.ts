import { Router } from 'express';
import {
  iniciarTurno,
  pausarTurno,
  reanudarTurno,
  finalizarTurno,
  getTurnoActivo,
  getTurnoPorId,
} from '../controllers/turnos.controller';

// authMiddleware y suscripcionMiddleware ya se aplican a /api/v1 en index.ts,
// por lo que todas estas rutas requieren conductor autenticado con suscripción activa.
const router = Router();

router.get('/activo',        getTurnoActivo);   // GET  /api/v1/turnos/activo
router.post('/iniciar',      iniciarTurno);     // POST /api/v1/turnos/iniciar
router.put('/:id/pausar',    pausarTurno);      // PUT  /api/v1/turnos/:id/pausar
router.put('/:id/reanudar',  reanudarTurno);    // PUT  /api/v1/turnos/:id/reanudar
router.put('/:id/finalizar', finalizarTurno);   // PUT  /api/v1/turnos/:id/finalizar
router.get('/:id',           getTurnoPorId);    // GET  /api/v1/turnos/:id  (después de /activo)

export default router;
