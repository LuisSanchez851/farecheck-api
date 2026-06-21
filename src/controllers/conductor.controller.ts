import { Request, Response } from 'express';
import { z } from 'zod';
import { Prisma } from '@prisma/client';
import { admin } from '../services/firebase.service';
import { prisma } from '../prisma/client';
import { logger } from '../utils/logger';

// POST /api/v1/conductor/crear — registro de un conductor nuevo (PÚBLICO: se monta
// antes del authMiddleware en index.ts, porque el conductor aún no existe en BD).
//
// SEGURIDAD: el firebase_uid NO se toma del body (sería suplantable). Se deriva del
// firebase_token verificado con Firebase Admin. El cliente envía el token, no el uid.
const crearConductorSchema = z.object({
  firebase_token: z.string().min(1, 'Token de Firebase requerido.'),
  nombre:         z.string().min(2, 'El nombre debe tener al menos 2 caracteres.').max(100),
  email:          z.string().email('Correo electrónico inválido.').optional(),
  telefono:       z.string().optional(),
});

export async function crearConductor(req: Request, res: Response): Promise<void> {
  try {
    const body = crearConductorSchema.parse(req.body);

    const decoded = await admin.auth().verifyIdToken(body.firebase_token);
    const firebase_uid = decoded.uid;

    // El firebase_uid NO debe existir todavía.
    const existente = await prisma.conductor.findUnique({
      where: { firebase_uid },
      select: { id: true },
    });
    if (existente) {
      res.status(409).json({
        error: 'conductor_ya_existe',
        message: 'Ya existe una cuenta asociada a este usuario. Inicia sesión.',
      });
      return;
    }

    const provider = decoded.firebase?.sign_in_provider ?? '';
    const auth_provider =
      provider.includes('phone') || (!!body.telefono && !decoded.email && !body.email)
        ? 'phone'
        : 'google';

    const fin_trial = new Date();
    fin_trial.setDate(fin_trial.getDate() + Number(process.env.TRIAL_DIAS ?? 7));

    const { conductor, suscripcion } = await prisma.$transaction(
      async (tx: Prisma.TransactionClient) => {
        const c = await tx.conductor.create({
          data: {
            firebase_uid,
            auth_provider,
            nombre:   body.nombre,
            email:    decoded.email ?? body.email,
            telefono: decoded.phone_number ?? body.telefono,
          },
        });
        const s = await tx.suscripcion.create({
          data: {
            conductor_id: c.id,
            plan:   'TRIAL',
            estado: 'ACTIVA',
            inicio: new Date(),
            fin:    fin_trial,
          },
        });
        return { conductor: c, suscripcion: s };
      },
    );

    logger.info(`Conductor creado (/crear): ${conductor.id} (${auth_provider})`);
    // Devolvemos el conductor + suscripción completos para que el cliente pueble el
    // store (setConductor/setSuscripcion). suscripcion_activa resume el estado del trial.
    res.status(201).json({ conductor, suscripcion, suscripcion_activa: true });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: 'validacion_fallida', message: error.errors[0]?.message });
      return;
    }
    const code = (error as { code?: string }).code;
    if (code?.startsWith('auth/')) {
      res.status(401).json({ error: 'token_invalido', message: 'Token de Firebase inválido.' });
      return;
    }
    logger.error('Error en crearConductor:', { error });
    res.status(500).json({ error: 'error_interno', message: 'No se pudo crear la cuenta.' });
  }
}

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
