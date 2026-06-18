import { Request, Response } from 'express';
import { z } from 'zod';
import { Prisma } from '@prisma/client';
import { admin } from '../services/firebase.service';
import { prisma } from '../prisma/client';
import { logger } from '../utils/logger';

const registroSchema = z.object({
  firebase_token: z.string().min(1, 'Token de Firebase requerido'),
  nombre:         z.string().min(2, 'Nombre mínimo 2 caracteres').max(100),
  telefono:       z.string().optional(),
  placa_vehiculo: z.string().optional(),
  marca_vehiculo: z.string().optional(),
  modelo_vehiculo: z.string().optional(),
});

const loginSchema = z.object({
  firebase_token: z.string().min(1, 'Token de Firebase requerido'),
});

export async function registro(req: Request, res: Response): Promise<void> {
  try {
    const body = registroSchema.parse(req.body);
    const decoded = await admin.auth().verifyIdToken(body.firebase_token);

    // Si el conductor ya existe, devolverlo (idempotente)
    const existente = await prisma.conductor.findUnique({
      where: { firebase_uid: decoded.uid },
    });

    if (existente) {
      res.status(200).json({ conductor: existente, ya_existia: true });
      return;
    }

    // Determinar proveedor de auth
    const auth_provider = decoded.firebase.sign_in_provider.includes('phone')
      ? 'phone'
      : 'google';

    // Crear conductor + trial en una transacción
    const fin_trial = new Date();
    fin_trial.setDate(fin_trial.getDate() + Number(process.env.TRIAL_DIAS ?? 7));

    const conductor = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const c = await tx.conductor.create({
        data: {
          firebase_uid:    decoded.uid,
          auth_provider,
          nombre:          body.nombre,
          email:           decoded.email,
          telefono:        decoded.phone_number ?? body.telefono,
          placa_vehiculo:  body.placa_vehiculo,
          marca_vehiculo:  body.marca_vehiculo,
          modelo_vehiculo: body.modelo_vehiculo,
        },
      });

      await tx.suscripcion.create({
        data: {
          conductor_id: c.id,
          plan:         'TRIAL',
          estado:       'ACTIVA',
          inicio:       new Date(),
          fin:          fin_trial,
        },
      });

      return c;
    });

    logger.info(`Nuevo conductor registrado: ${conductor.id} (${auth_provider})`);
    res.status(201).json({ conductor });
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
    logger.error('Error en registro:', { error });
    res.status(500).json({ error: 'error_interno', message: 'Error al crear la cuenta.' });
  }
}

export async function login(req: Request, res: Response): Promise<void> {
  try {
    const { firebase_token } = loginSchema.parse(req.body);
    const decoded = await admin.auth().verifyIdToken(firebase_token);

    const conductor = await prisma.conductor.findUnique({
      where: { firebase_uid: decoded.uid },
    });

    if (!conductor) {
      res.status(401).json({
        error: 'conductor_no_encontrado',
        message: 'No encontramos tu cuenta. Por favor regístrate primero.',
      });
      return;
    }

    // Adjuntar suscripción activa para que el cliente sepa el estado del trial
    const suscripcion = await prisma.suscripcion.findFirst({
      where: {
        conductor_id: conductor.id,
        fin: { gte: new Date() },
      },
      orderBy: { fin: 'desc' },
    });

    res.json({ conductor, suscripcion });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: 'validacion_fallida', message: error.errors[0]?.message });
      return;
    }
    const code = (error as { code?: string }).code;
    if (code === 'auth/id-token-expired') {
      res.status(401).json({ error: 'token_expirado', message: 'Sesión expirada.' });
      return;
    }
    if (code?.startsWith('auth/')) {
      res.status(401).json({ error: 'token_invalido', message: 'Token inválido.' });
      return;
    }
    logger.error('Error en login:', { error });
    res.status(500).json({ error: 'error_interno', message: 'Error al iniciar sesión.' });
  }
}
