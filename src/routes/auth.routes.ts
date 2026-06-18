import { Router } from 'express';
import { registro, login } from '../controllers/auth.controller';

const router = Router();

// POST /api/v1/auth/registro — público
router.post('/registro', registro);

// POST /api/v1/auth/login — público
router.post('/login', login);

export default router;
