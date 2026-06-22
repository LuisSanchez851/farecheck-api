import { Request, Response } from 'express';
import { z } from 'zod';
import { Prisma } from '@prisma/client';
import { prisma } from '../prisma/client';
import { logger } from '../utils/logger';
import { API_ERRORS } from '../types/api.types';
import { RentabilidadService } from '../services/rentabilidad.service';

const historialQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(10),
  estado: z.enum(['todos', 'aceptados', 'rechazados']).default('todos'),
});

const idParamSchema = z.object({
  id: z.string().uuid('El identificador del servicio no es válido.'),
});

// Alta de un servicio evaluado. km_recogida y los tiempos son opcionales (el OCR no
// siempre los alcanza a leer); el semáforo se calcula sobre los km del recorrido.
const crearServicioSchema = z.object({
  plataforma_id:         z.string().uuid('La plataforma no es válida.'),
  turno_id:              z.string().uuid('El turno no es válido.'),
  valor_cop:             z.number().positive('El valor del servicio debe ser mayor a 0.'),
  km_recorrido:          z.number().positive('Los km del recorrido deben ser mayores a 0.'),
  km_recogida:           z.number().min(0).default(0),
  tiempo_recogida_min:   z.number().int().min(0).default(0),
  tiempo_total_min:      z.number().int().min(0).default(0),
  calificacion_pasajero: z.number().min(0).max(5).optional(),
  viajes_pasajero:       z.number().int().min(0).optional(),
});

const decisionBodySchema = z.object({
  aceptado: z.boolean({ required_error: 'Debes indicar si aceptaste el servicio.' }),
});

// ── GET /api/v1/servicios?page=&limit=&estado= ──────────────────────────────────
// Historial paginado de servicios del conductor (vía turno), más reciente primero.
export async function listarServicios(req: Request, res: Response): Promise<void> {
  try {
    const { page, limit, estado } = historialQuerySchema.parse(req.query);

    const where: Prisma.ServicioWhereInput = {
      turno: { conductor_id: req.conductor_id },
      ...(estado === 'aceptados'
        ? { aceptado: true }
        : estado === 'rechazados'
          ? { aceptado: false }
          : {}),
    };

    const [servicios, total] = await Promise.all([
      prisma.servicio.findMany({
        where,
        orderBy: { registrado_en: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        include: { plataforma: { select: { id: true, nombre: true, icono_url: true } } },
      }),
      prisma.servicio.count({ where }),
    ]);

    res.json({ servicios, page, limit, total, has_more: page * limit < total });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: API_ERRORS.VALIDACION_FALLIDA, message: error.errors[0]?.message });
      return;
    }
    logger.error('Error en listarServicios:', { error });
    res.status(500).json({ error: 'error_interno', message: 'No se pudo obtener el historial de servicios.' });
  }
}

// ── GET /api/v1/servicios/:id ───────────────────────────────────────────────────
// Detalle de un servicio del conductor (validado vía turno.conductor_id).
export async function obtenerServicio(req: Request, res: Response): Promise<void> {
  try {
    const { id } = idParamSchema.parse(req.params);

    const servicio = await prisma.servicio.findFirst({
      where: { id, turno: { conductor_id: req.conductor_id } },
      include: {
        plataforma: { select: { id: true, nombre: true, icono_url: true } },
        turno: { select: { id: true, estado: true } },
      },
    });

    if (!servicio) {
      res.status(404).json({ error: API_ERRORS.VIAJE_NO_ENCONTRADO, message: 'Servicio no encontrado.' });
      return;
    }

    res.json(servicio);
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: API_ERRORS.VALIDACION_FALLIDA, message: error.errors[0]?.message });
      return;
    }
    logger.error('Error en obtenerServicio:', { error });
    res.status(500).json({ error: 'error_interno', message: 'No se pudo obtener el servicio.' });
  }
}

// ── POST /api/v1/servicios ──────────────────────────────────────────────────────
// Registra un servicio evaluado. Valida que el turno pertenezca al conductor y esté
// abierto, que la plataforma exista, delega el semáforo a RentabilidadService (lógica
// protegida en servidor) y devuelve el servicio creado junto al análisis.
export async function crearServicio(req: Request, res: Response): Promise<void> {
  try {
    const input = crearServicioSchema.parse(req.body);

    // El turno debe existir, ser del conductor y no estar finalizado.
    const turno = await prisma.turno.findFirst({
      where: { id: input.turno_id, conductor_id: req.conductor_id },
      select: { estado: true },
    });

    if (!turno) {
      res.status(404).json({ error: API_ERRORS.TURNO_NO_ENCONTRADO, message: 'Turno no encontrado.' });
      return;
    }

    if (turno.estado === 'FINALIZADO') {
      res.status(409).json({
        error: API_ERRORS.TURNO_NO_ACTIVO,
        message: 'No puedes registrar servicios en un turno finalizado.',
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

    // Umbrales personalizados del conductor — nunca se exponen al cliente.
    const conductor = await prisma.conductor.findUnique({
      where: { id: req.conductor_id },
      select: { umbral_verde_copkm: true, umbral_amarillo_copkm: true },
    });

    if (!conductor) {
      res.status(404).json({ error: API_ERRORS.CONDUCTOR_NO_ENCONTRADO, message: 'Conductor no encontrado.' });
      return;
    }

    // Lógica protegida: el cliente solo recibe el resultado, nunca los umbrales.
    const analisis = RentabilidadService.calcular(input.valor_cop, input.km_recorrido, conductor);

    const servicio = await prisma.servicio.create({
      data: {
        turno_id:              input.turno_id,
        plataforma_id:         input.plataforma_id,
        valor_cop:             input.valor_cop,
        km_recogida:           input.km_recogida,
        km_recorrido:          input.km_recorrido,
        km_total:              input.km_recogida + input.km_recorrido,
        tiempo_recogida_min:   input.tiempo_recogida_min,
        tiempo_total_min:      input.tiempo_total_min,
        calificacion_pasajero: input.calificacion_pasajero,
        viajes_pasajero:       input.viajes_pasajero,
        valor_copkm:           Math.round(analisis.rentabilidad_cop_km),
        semaforo:              analisis.semaforo,
        porcentaje_vs_umbral:  analisis.porcentaje_vs_umbral,
        aceptado:              null,
      },
      include: { plataforma: { select: { id: true, nombre: true, icono_url: true } } },
    });

    res.status(201).json({
      servicio,
      analisis: {
        rentabilidad_cop_km:  analisis.rentabilidad_cop_km,
        semaforo:             analisis.semaforo,
        porcentaje_vs_umbral: analisis.porcentaje_vs_umbral,
        mensaje:              analisis.mensaje,
      },
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
    logger.error('Error en crearServicio:', { error });
    res.status(500).json({ error: 'error_interno', message: 'No se pudo crear el servicio.' });
  }
}

// ── PATCH /api/v1/servicios/:id/decision ────────────────────────────────────────
// Registra si el conductor aceptó o rechazó el servicio. Verifica que el servicio
// exista y pertenezca al conductor (vía su turno) antes de actualizar.
export async function actualizarDecision(req: Request, res: Response): Promise<void> {
  try {
    const { id } = idParamSchema.parse(req.params);
    const { aceptado } = decisionBodySchema.parse(req.body);

    const servicio = await prisma.servicio.findFirst({
      where: { id, turno: { conductor_id: req.conductor_id } },
      select: { id: true },
    });

    if (!servicio) {
      res.status(404).json({ error: API_ERRORS.VIAJE_NO_ENCONTRADO, message: 'Servicio no encontrado.' });
      return;
    }

    const actualizado = await prisma.servicio.update({
      where: { id: servicio.id },
      data: { aceptado },
      include: { plataforma: { select: { id: true, nombre: true, icono_url: true } } },
    });

    res.json(actualizado);
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({
        error: API_ERRORS.VALIDACION_FALLIDA,
        message: error.errors[0]?.message ?? 'Datos inválidos.',
        details: error.errors,
      });
      return;
    }
    logger.error('Error en actualizarDecision:', { error });
    res.status(500).json({ error: 'error_interno', message: 'No se pudo registrar la decisión.' });
  }
}
