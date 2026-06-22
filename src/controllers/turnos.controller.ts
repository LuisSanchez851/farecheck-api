import { Request, Response } from 'express';
import { z } from 'zod';
import { EstadoTurno } from '@prisma/client';
import { prisma } from '../prisma/client';
import { logger } from '../utils/logger';
import { API_ERRORS } from '../types/api.types';

// El :id del turno siempre es un uuid — validado con Zod en cada endpoint que lo recibe
const idParamSchema = z.object({
  id: z.string().uuid('El identificador del turno no es válido.'),
});

// Minutos enteros entre dos instantes (nunca negativo)
const diffMin = (inicio: Date, fin: Date): number =>
  Math.max(0, Math.round((fin.getTime() - inicio.getTime()) / 60_000));

function handleError(res: Response, error: unknown, contexto: string, mensaje: string): void {
  if (error instanceof z.ZodError) {
    res.status(400).json({
      error: API_ERRORS.VALIDACION_FALLIDA,
      message: error.errors[0]?.message ?? 'Datos inválidos.',
    });
    return;
  }
  logger.error(`Error en ${contexto}:`, { error });
  res.status(500).json({ error: 'error_interno', message: mensaje });
}

// ── POST /api/v1/turnos/iniciar ─────────────────────────────────────────────────
// Crea un turno en estado ACTIVO. Rechaza si el conductor ya tiene un turno abierto
// (ACTIVO o PAUSADO) para evitar turnos solapados.
export async function iniciarTurno(req: Request, res: Response): Promise<void> {
  try {
    const abierto = await prisma.turno.findFirst({
      where: {
        conductor_id: req.conductor_id,
        estado: { in: [EstadoTurno.ACTIVO, EstadoTurno.PAUSADO] },
      },
      select: { id: true },
    });

    if (abierto) {
      res.status(409).json({
        error: API_ERRORS.TURNO_YA_ACTIVO,
        message: 'Ya tienes un turno abierto. Finalízalo antes de iniciar uno nuevo.',
      });
      return;
    }

    const turno = await prisma.turno.create({
      data: {
        conductor_id: req.conductor_id,
        inicio: new Date(),
        estado: EstadoTurno.ACTIVO,
      },
    });

    res.status(201).json(turno);
  } catch (error) {
    handleError(res, error, 'iniciarTurno', 'No se pudo iniciar el turno.');
  }
}

// ── PUT /api/v1/turnos/:id/pausar ───────────────────────────────────────────────
// Abre un registro de Pausa y pasa el turno a PAUSADO. Solo desde estado ACTIVO.
export async function pausarTurno(req: Request, res: Response): Promise<void> {
  try {
    const { id } = idParamSchema.parse(req.params);

    const turno = await prisma.turno.findFirst({
      where: { id, conductor_id: req.conductor_id },
      select: { id: true, estado: true },
    });

    if (!turno) {
      res.status(404).json({ error: API_ERRORS.TURNO_NO_ENCONTRADO, message: 'Turno no encontrado.' });
      return;
    }

    if (turno.estado !== EstadoTurno.ACTIVO) {
      res.status(409).json({
        error: API_ERRORS.TURNO_NO_ACTIVO,
        message: 'Solo puedes pausar un turno activo.',
      });
      return;
    }

    const actualizado = await prisma.$transaction(async (tx) => {
      await tx.pausa.create({ data: { turno_id: id, inicio: new Date() } });
      return tx.turno.update({ where: { id }, data: { estado: EstadoTurno.PAUSADO } });
    });

    res.json(actualizado);
  } catch (error) {
    handleError(res, error, 'pausarTurno', 'No se pudo pausar el turno.');
  }
}

// ── PUT /api/v1/turnos/:id/reanudar ─────────────────────────────────────────────
// Cierra la pausa abierta, acumula su duración en tiempo_pausa_min y vuelve a ACTIVO.
export async function reanudarTurno(req: Request, res: Response): Promise<void> {
  try {
    const { id } = idParamSchema.parse(req.params);

    const turno = await prisma.turno.findFirst({
      where: { id, conductor_id: req.conductor_id },
      select: { id: true, estado: true },
    });

    if (!turno) {
      res.status(404).json({ error: API_ERRORS.TURNO_NO_ENCONTRADO, message: 'Turno no encontrado.' });
      return;
    }

    if (turno.estado !== EstadoTurno.PAUSADO) {
      res.status(409).json({
        error: API_ERRORS.TURNO_NO_ACTIVO,
        message: 'Solo puedes reanudar un turno pausado.',
      });
      return;
    }

    const ahora = new Date();
    const pausaAbierta = await prisma.pausa.findFirst({
      where: { turno_id: id, fin: null },
      orderBy: { inicio: 'desc' },
    });
    const minutosPausa = pausaAbierta ? diffMin(pausaAbierta.inicio, ahora) : 0;

    const actualizado = await prisma.$transaction(async (tx) => {
      if (pausaAbierta) {
        await tx.pausa.update({ where: { id: pausaAbierta.id }, data: { fin: ahora } });
      }
      return tx.turno.update({
        where: { id },
        data: {
          estado: EstadoTurno.ACTIVO,
          tiempo_pausa_min: { increment: minutosPausa },
        },
      });
    });

    res.json(actualizado);
  } catch (error) {
    handleError(res, error, 'reanudarTurno', 'No se pudo reanudar el turno.');
  }
}

// ── PUT /api/v1/turnos/:id/finalizar ────────────────────────────────────────────
// Cierra la pausa abierta (si la hay), calcula todos los totales y deja el turno
// en FINALIZADO. Devuelve el resumen completo.
export async function finalizarTurno(req: Request, res: Response): Promise<void> {
  try {
    const { id } = idParamSchema.parse(req.params);

    const turno = await prisma.turno.findFirst({
      where: { id, conductor_id: req.conductor_id },
      include: { pausas: { where: { fin: null }, orderBy: { inicio: 'desc' }, take: 1 } },
    });

    if (!turno) {
      res.status(404).json({ error: API_ERRORS.TURNO_NO_ENCONTRADO, message: 'Turno no encontrado.' });
      return;
    }

    if (turno.estado === EstadoTurno.FINALIZADO) {
      res.status(409).json({
        error: API_ERRORS.TURNO_NO_ACTIVO,
        message: 'El turno ya está finalizado.',
      });
      return;
    }

    const ahora = new Date();
    const pausaAbierta = turno.pausas[0];

    // tiempo_pausa_min ya acumula las pausas cerradas en /reanudar; sumamos la que
    // siga abierta al finalizar estando en PAUSADO.
    const tiempoPausaMin =
      turno.tiempo_pausa_min + (pausaAbierta ? diffMin(pausaAbierta.inicio, ahora) : 0);
    const tiempoTotalMin = diffMin(turno.inicio, ahora);
    const tiempoActivoMin = Math.max(0, tiempoTotalMin - tiempoPausaMin);

    const actualizado = await prisma.$transaction(async (tx) => {
      if (pausaAbierta) {
        await tx.pausa.update({ where: { id: pausaAbierta.id }, data: { fin: ahora } });
      }

      // Ingreso y km reales provienen solo de los viajes aceptados (los rechazados
      // nunca se recorrieron). Los conteos sí cubren todos los viajes analizados.
      const agg = await tx.servicio.aggregate({
        where: { turno_id: id, aceptado: true },
        _sum: { valor_cop: true, km_recorrido: true },
      });
      const totalViajes = await tx.servicio.count({ where: { turno_id: id } });
      const aceptados = await tx.servicio.count({ where: { turno_id: id, aceptado: true } });
      const rechazados = await tx.servicio.count({ where: { turno_id: id, aceptado: false } });

      return tx.turno.update({
        where: { id },
        data: {
          estado: EstadoTurno.FINALIZADO,
          fin: ahora,
          tiempo_pausa_min: tiempoPausaMin,
          tiempo_activo_min: tiempoActivoMin,
          total_viajes: totalViajes,
          viajes_aceptados: aceptados,
          viajes_rechazados: rechazados,
          ingreso_total_cop: agg._sum.valor_cop ?? 0,
          km_totales: agg._sum.km_recorrido ?? 0,
        },
      });
    });

    res.json(actualizado);
  } catch (error) {
    handleError(res, error, 'finalizarTurno', 'No se pudo finalizar el turno.');
  }
}

// ── GET /api/v1/turnos/activo ───────────────────────────────────────────────────
// Devuelve el turno abierto (ACTIVO o PAUSADO) del conductor con sus últimos 3
// viajes, o `null` si no hay ninguno. Como el turno aún no está finalizado, sus
// totales persistidos siguen en 0: aquí los calculamos en vivo. También exponemos
// el inicio de la pausa abierta para que el cliente cronometre el tiempo activo
// con exactitud aunque se cargue la pantalla en medio de una pausa.
export async function getTurnoActivo(req: Request, res: Response): Promise<void> {
  try {
    const turno = await prisma.turno.findFirst({
      where: {
        conductor_id: req.conductor_id,
        estado: { in: [EstadoTurno.ACTIVO, EstadoTurno.PAUSADO] },
      },
      orderBy: { inicio: 'desc' },
      include: {
        viajes: {
          orderBy: { registrado_en: 'desc' },
          take: 3,
          include: { plataforma: { select: { id: true, nombre: true, icono_url: true } } },
        },
      },
    });

    if (!turno) {
      res.json(null);
      return;
    }

    const agg = await prisma.servicio.aggregate({
      where: { turno_id: turno.id, aceptado: true },
      _sum: { valor_cop: true, km_recorrido: true },
    });
    const totalViajes = await prisma.servicio.count({ where: { turno_id: turno.id } });
    const aceptados = await prisma.servicio.count({ where: { turno_id: turno.id, aceptado: true } });
    const rechazados = await prisma.servicio.count({ where: { turno_id: turno.id, aceptado: false } });

    let pausaActualInicio: Date | null = null;
    if (turno.estado === EstadoTurno.PAUSADO) {
      const pausa = await prisma.pausa.findFirst({
        where: { turno_id: turno.id, fin: null },
        orderBy: { inicio: 'desc' },
        select: { inicio: true },
      });
      pausaActualInicio = pausa?.inicio ?? null;
    }

    res.json({
      ...turno,
      total_viajes: totalViajes,
      viajes_aceptados: aceptados,
      viajes_rechazados: rechazados,
      ingreso_total_cop: agg._sum.valor_cop ?? 0,
      km_totales: agg._sum.km_recorrido ?? 0,
      pausa_actual_inicio: pausaActualInicio,
    });
  } catch (error) {
    handleError(res, error, 'getTurnoActivo', 'No se pudo obtener el turno activo.');
  }
}

// ── GET /api/v1/turnos/:id ──────────────────────────────────────────────────────
// Devuelve un turno (típicamente finalizado) con todos sus viajes, para el resumen.
export async function getTurnoPorId(req: Request, res: Response): Promise<void> {
  try {
    const { id } = idParamSchema.parse(req.params);

    const turno = await prisma.turno.findFirst({
      where: { id, conductor_id: req.conductor_id },
      include: {
        viajes: {
          orderBy: { registrado_en: 'asc' },
          include: { plataforma: { select: { id: true, nombre: true, icono_url: true } } },
        },
      },
    });

    if (!turno) {
      res.status(404).json({ error: API_ERRORS.TURNO_NO_ENCONTRADO, message: 'Turno no encontrado.' });
      return;
    }

    res.json(turno);
  } catch (error) {
    handleError(res, error, 'getTurnoPorId', 'No se pudo obtener el turno.');
  }
}
