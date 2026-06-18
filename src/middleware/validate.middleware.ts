import { Request, Response, NextFunction } from 'express';
import { z, ZodError } from 'zod';
import { API_ERRORS } from '../types/api.types';

// Validador de body con Zod — usar en cualquier ruta que reciba JSON
export function validateBody(schema: z.ZodSchema) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      res.status(400).json({
        error: API_ERRORS.VALIDACION_FALLIDA,
        message: result.error.errors[0]?.message ?? 'Datos inválidos.',
        details: result.error.errors,
      });
      return;
    }
    req.body = result.data; // reemplaza con datos parseados y sanitizados
    next();
  };
}
