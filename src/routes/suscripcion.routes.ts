import { Router } from 'express';

const router = Router();
const stub = (_: unknown, res: { status: (n: number) => { json: (o: unknown) => void } }) =>
  res.status(501).json({ message: 'Disponible en Sprint 4' });

// GET  /api/v1/suscripcion/estado
router.get('/estado',    stub);
// POST /api/v1/suscripcion/checkout
router.post('/checkout', stub);
// POST /api/v1/suscripcion/webhook — Stripe (sin JWT)
router.post('/webhook',  stub);
// DELETE /api/v1/suscripcion
router.delete('/',       stub);

export default router;
