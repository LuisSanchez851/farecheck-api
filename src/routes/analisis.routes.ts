import { Router } from 'express';

const router = Router();

// POST /api/v1/analisis — el endpoint más crítico del producto (Sprint 3)
router.post('/', (_req, res) => {
  res.status(501).json({ message: 'Motor de análisis disponible en Sprint 3' });
});

export default router;
