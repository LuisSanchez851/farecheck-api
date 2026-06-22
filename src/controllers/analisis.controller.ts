import { Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../prisma/client';
import { analizarServicio, getSemaforoMensaje } from '../services/semaforo.service';
import { logger } from '../utils/logger';
import { API_ERRORS } from '../types/api.types';

// Payload que envía el módulo OCR Android tras parsear la oferta en pantalla.
// km_recogida y los tiempos son opcionales: el OCR no siempre alcanza a leerlos,
// así que por defecto valen 0 (el semáforo se calcula sobre los km del recorrido).
const analisisSchema = z.object({
  valor_cop:             z.number().positive('El valor del servicio debe ser mayor a 0.'),
  km_recorrido:          z.number().positive('Los km del recorrido deben ser mayores a 0.'),
  km_recogida:           z.number().min(0).default(0),
  tiempo_recogida_min:   z.number().int().min(0).default(0),
  tiempo_total_min:      z.number().int().min(0).default(0),
  plataforma_id:         z.string().uuid('La plataforma no es válida.'),
  turno_id:              z.string().uuid('El turno no es válido.'),
  calificacion_pasajero: z.number().min(0).max(5).optional(),
  viajes_pasajero:       z.number().int().min(0).optional(),
});

// ── POST /api/v1/analisis ────────────────────────────────────────────────────
// Núcleo del producto (Sprint 3). Recibe la oferta parseada por el OCR, valida que
// el turno pertenezca al conductor y esté abierto, delega el cálculo del semáforo a
// semaforo.service (lógica protegida en servidor) y devuelve el resultado + viaje_id.
export async function analizarOferta(req: Request, res: Response): Promise<void> {
  try {
    const input = analisisSchema.parse(req.body);

    // El turno debe existir, ser del conductor y no estar finalizado.
    const turno = await prisma.turno.findFirst({
      where: { id: input.turno_id, conductor_id: req.conductor_id },
      select: { estado: true },
    });

    if (!turno) {
      res.status(404).json({
        error: API_ERRORS.TURNO_NO_ENCONTRADO,
        message: 'Turno no encontrado.',
      });
      return;
    }

    if (turno.estado === 'FINALIZADO') {
      res.status(409).json({
        error: API_ERRORS.TURNO_NO_ACTIVO,
        message: 'No puedes analizar ofertas en un turno finalizado.',
      });
      return;
    }

    // La plataforma debe existir en el catálogo.
    const plataforma = await prisma.plataforma.findUnique({
      where: { id: input.plataforma_id },
      select: { id: true },
    });

    if (!plataforma) {
      res.status(400).json({
        error: API_ERRORS.VALIDACION_FALLIDA,
        message: 'La plataforma indicada no existe.',
      });
      return;
    }

    const resultado = await analizarServicio(input, req.conductor_id);

    res.status(201).json({
      ...resultado,
      mensaje: getSemaforoMensaje(resultado.semaforo),
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({
        error: API_ERRORS.VALIDACION_FALLIDA,
        message: error.errors[0]?.message ?? 'Datos inválidos.',
        details: error.errors,
      });
      return;
    }
    logger.error('Error en analizarOferta:', { error });
    res.status(500).json({ error: 'error_interno', message: 'No se pudo analizar la oferta.' });
  }
}

// Decisión del conductor sobre una oferta ya analizada. El timestamp es opcional
// (registrado por el cliente) y se acepta para auditoría futura; hoy no se persiste
// porque el modelo Viaje no tiene columna para ello.
const decisionSchema = z.object({
  decision:  z.enum(['aceptado', 'rechazado']),
  timestamp: z.string().datetime().optional(),
});

const viajeIdSchema = z.string().uuid('El identificador del viaje no es válido.');

// ── PATCH /api/v1/analisis/:viaje_id/decision ────────────────────────────────
// Registra si el conductor aceptó o rechazó la oferta. Verifica que el viaje exista
// y pertenezca al conductor (vía su turno) y actualiza viajes.aceptado.
export async function registrarDecision(req: Request, res: Response): Promise<void> {
  try {
    const viajeId = viajeIdSchema.parse(req.params.viaje_id);
    const { decision } = decisionSchema.parse(req.body);

    // El viaje debe pertenecer al conductor autenticado (a través de su turno).
    const viaje = await prisma.servicio.findFirst({
      where: { id: viajeId, turno: { conductor_id: req.conductor_id } },
      select: { id: true, semaforo: true },
    });

    if (!viaje) {
      res.status(404).json({
        error: API_ERRORS.VIAJE_NO_ENCONTRADO,
        message: 'Viaje no encontrado.',
      });
      return;
    }

    const aceptado = decision === 'aceptado';
    await prisma.servicio.update({ where: { id: viaje.id }, data: { aceptado } });

    res.json({
      viaje_id: viaje.id,
      decision,
      semaforo_al_momento: viaje.semaforo,
      mensaje: aceptado ? 'Decisión registrada: aceptaste el viaje.' : 'Decisión registrada: rechazaste el viaje.',
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({
        error: API_ERRORS.VALIDACION_FALLIDA,
        message: error.errors[0]?.message ?? 'Datos inválidos.',
        details: error.errors,
      });
      return;
    }
    logger.error('Error en registrarDecision:', { error });
    res.status(500).json({ error: 'error_interno', message: 'No se pudo registrar la decisión.' });
  }
}
