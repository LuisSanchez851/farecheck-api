import { Router } from 'express';
import { getPerfil, updatePerfil, updateUmbrales } from '../controllers/conductor.controller';

const router = Router();

// GET  /api/v1/conductor/perfil
router.get('/perfil', getPerfil);

// PUT  /api/v1/conductor/perfil
router.put('/perfil', updatePerfil);

// PUT  /api/v1/conductor/umbrales
router.put('/umbrales', updateUmbrales);

// POST /api/v1/conductor/contactos — S4-07
router.post('/contactos', (_req, res) => res.status(501).json({ message: 'Disponible en Sprint 4' }));

export default router;
