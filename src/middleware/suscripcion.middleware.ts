import { Request, Response, NextFunction } from 'express';
import { prisma } from '../prisma/client';
import { API_ERRORS } from '../types/api.types';

export async function suscripcionMiddleware(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const suscripcion = await prisma.suscripcion.findFirst({
      where: {
        conductor_id: req.conductor_id,
        estado: 'ACTIVA',
        fin: { gte: new Date() },
      },
    });

    if (!suscripcion) {
      res.status(402).json({
        error: API_ERRORS.SUSCRIPCION_REQUERIDA,
        message: 'Tu periodo de prueba ha expirado. Suscríbete para continuar.',
      });
      return;
    }

    next();
  } catch {
    next();
  }
}
