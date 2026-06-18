import { Request, Response } from 'express';
import { z } from 'zod';
import { Prisma } from '@prisma/client';
import { prisma } from '../prisma/client';
import { logger } from '../utils/logger';
import { API_ERRORS } from '../types/api.types';

const historialQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(10),
  estado: z.enum(['todos', 'aceptados', 'rechazados']).default('todos'),
});

const idParamSchema = z.object({
  id: z.string().uuid('El identificador del viaje no es válido.'),
});

// ── GET /api/v1/viajes?page=&limit=&estado= ─────────────────────────────────────
// Historial paginado de viajes del conductor (vía turno), más reciente primero.
export async function getHistorial(req: Request, res: Response): Promise<void> {
  try {
    const { page, limit, estado } = historialQuerySchema.parse(req.query);

    const where: Prisma.ViajeWhereInput = {
      turno: { conductor_id: req.conductor_id },
      ...(estado === 'aceptados'
        ? { aceptado: true }
        : estado === 'rechazados'
          ? { aceptado: false }
          : {}),
    };

    const [viajes, total] = await Promise.all([
      prisma.viaje.findMany({
        where,
        orderBy: { registrado_en: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        include: { plataforma: { select: { id: true, nombre: true, icono_url: true } } },
      }),
      prisma.viaje.count({ where }),
    ]);

    res.json({ viajes, page, limit, total, has_more: page * limit < total });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: API_ERRORS.VALIDACION_FALLIDA, message: error.errors[0]?.message });
      return;
    }
    logger.error('Error en getHistorial:', { error });
    res.status(500).json({ error: 'error_interno', message: 'No se pudo obtener el historial de viajes.' });
  }
}

// ── GET /api/v1/viajes/:id ──────────────────────────────────────────────────────
// Detalle de un viaje del conductor (validado vía turno.conductor_id).
export async function getViaje(req: Request, res: Response): Promise<void> {
  try {
    const { id } = idParamSchema.parse(req.params);

    const viaje = await prisma.viaje.findFirst({
      where: { id, turno: { conductor_id: req.conductor_id } },
      include: {
        plataforma: { select: { id: true, nombre: true, icono_url: true } },
        turno: { select: { id: true, estado: true } },
      },
    });

    if (!viaje) {
      res.status(404).json({ error: 'viaje_no_encontrado', message: 'Viaje no encontrado.' });
      return;
    }

    res.json(viaje);
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: API_ERRORS.VALIDACION_FALLIDA, message: error.errors[0]?.message });
      return;
    }
    logger.error('Error en getViaje:', { error });
    res.status(500).json({ error: 'error_interno', message: 'No se pudo obtener el viaje.' });
  }
}
