import { Request, Response, NextFunction } from 'express';
import { admin } from '../services/firebase.service';
import { prisma } from '../prisma/client';
import { API_ERRORS } from '../types/api.types';

// Extiende el tipo Request de Express con los campos inyectados por este middleware
declare global {
  namespace Express {
    interface Request {
      conductor_id: string;
      firebase_uid: string;
    }
  }
}

export async function authMiddleware(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader?.startsWith('Bearer ')) {
      res.status(401).json({
        error: API_ERRORS.TOKEN_INVALIDO,
        message: 'Se requiere token de autenticación.',
      });
      return;
    }

    const token = authHeader.split('Bearer ')[1];
    const decoded = await admin.auth().verifyIdToken(token);
    const firebase_uid = decoded.uid;

    const conductor = await prisma.conductor.findUnique({
      where: { firebase_uid },
      select: { id: true },
    });

    if (!conductor) {
      res.status(401).json({
        error: API_ERRORS.CONDUCTOR_NO_ENCONTRADO,
        message: 'El conductor no está registrado. Por favor regístrate primero.',
      });
      return;
    }

    req.conductor_id = conductor.id;
    req.firebase_uid = firebase_uid;
    next();
  } catch (error: unknown) {
    const code = (error as { code?: string }).code;
    if (code === 'auth/id-token-expired') {
      res.status(401).json({
        error: API_ERRORS.TOKEN_EXPIRADO,
        message: 'Tu sesión ha expirado. Inicia sesión de nuevo.',
      });
      return;
    }
    res.status(401).json({
      error: API_ERRORS.TOKEN_INVALIDO,
      message: 'Token de autenticación inválido.',
    });
  }
}
