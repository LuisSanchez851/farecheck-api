import { Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../prisma/client';
import { logger } from '../utils/logger';

const updatePerfilSchema = z.object({
  nombre:          z.string().min(2).max(100).optional(),
  foto_url:        z.string().url().optional(),
  placa_vehiculo:  z.string().max(10).optional(),
  marca_vehiculo:  z.string().max(50).optional(),
  modelo_vehiculo: z.string().max(50).optional(),
  anio_vehiculo:   z.number().int().min(1990).max(new Date().getFullYear() + 1).optional(),
});

const updateUmbralesSchema = z.object({
  umbral_verde_copkm:    z.number().min(100).max(10000),
  umbral_amarillo_copkm: z.number().min(100).max(10000),
}).refine(
  (data) => data.umbral_amarillo_copkm < data.umbral_verde_copkm,
  { message: 'El umbral amarillo debe ser menor al umbral verde.' },
);

export async function getPerfil(req: Request, res: Response): Promise<void> {
  try {
    const conductor = await prisma.conductor.findUnique({
      where: { id: req.conductor_id },
    });

    if (!conductor) {
      res.status(404).json({ error: 'conductor_no_encontrado', message: 'Perfil no encontrado.' });
      return;
    }

    res.json(conductor);
  } catch (error) {
    logger.error('Error en getPerfil:', { error });
    res.status(500).json({ error: 'error_interno', message: 'Error al obtener el perfil.' });
  }
}

export async function updatePerfil(req: Request, res: Response): Promise<void> {
  try {
    const body = updatePerfilSchema.parse(req.body);

    const conductor = await prisma.conductor.update({
      where: { id: req.conductor_id },
      data: body,
    });

    res.json(conductor);
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: 'validacion_fallida', message: error.errors[0]?.message });
      return;
    }
    logger.error('Error en updatePerfil:', { error });
    res.status(500).json({ error: 'error_interno', message: 'Error al actualizar el perfil.' });
  }
}

export async function updateUmbrales(req: Request, res: Response): Promise<void> {
  try {
    const body = updateUmbralesSchema.parse(req.body);

    const conductor = await prisma.conductor.update({
      where: { id: req.conductor_id },
      data: {
        umbral_verde_copkm:    body.umbral_verde_copkm,
        umbral_amarillo_copkm: body.umbral_amarillo_copkm,
      },
      select: {
        id: true,
        umbral_verde_copkm: true,
        umbral_amarillo_copkm: true,
      },
    });

    res.json(conductor);
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: 'validacion_fallida', message: error.errors[0]?.message });
      return;
    }
    logger.error('Error en updateUmbrales:', { error });
    res.status(500).json({ error: 'error_interno', message: 'Error al actualizar umbrales.' });
  }
}
