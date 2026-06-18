import { Request, Response } from 'express';
import { Prisma } from '@prisma/client';
import { prisma } from '../prisma/client';
import { logger } from '../utils/logger';

// Colombia (America/Bogota) es UTC-5 fijo, sin horario de verano. Usamos un offset
// constante para delimitar los días calendario locales — agrupar por UTC partiría
// el día a las 7pm hora local y descuadraría el balance diario.
const BOGOTA_OFFSET_MS = 5 * 60 * 60 * 1000;
const DIA_MS = 24 * 60 * 60 * 1000;
const DIAS_SEMANA = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'] as const;

// Instante UTC que corresponde a la medianoche de hoy en Bogotá.
function inicioDiaBogota(now: Date): Date {
  const local = new Date(now.getTime() - BOGOTA_OFFSET_MS);
  local.setUTCHours(0, 0, 0, 0);
  return new Date(local.getTime() + BOGOTA_OFFSET_MS);
}

const addDias = (fecha: Date, dias: number): Date => new Date(fecha.getTime() + dias * DIA_MS);

// Dado el instante UTC de una medianoche en Bogotá, devuelve la fecha local y su
// etiqueta de día de la semana.
function partesDiaBogota(instanteMedianoche: Date): { fecha: string; dia: string } {
  const local = new Date(instanteMedianoche.getTime() - BOGOTA_OFFSET_MS);
  const y = local.getUTCFullYear();
  const m = String(local.getUTCMonth() + 1).padStart(2, '0');
  const d = String(local.getUTCDate()).padStart(2, '0');
  return { fecha: `${y}-${m}-${d}`, dia: DIAS_SEMANA[local.getUTCDay()] };
}

// Solo los viajes aceptados cuentan como ingreso/km/tiempo reales del balance.
function whereConductorAceptados(conductorId: string, desde: Date, hasta?: Date): Prisma.ViajeWhereInput {
  return {
    aceptado: true,
    turno: { conductor_id: conductorId },
    registrado_en: hasta ? { gte: desde, lt: hasta } : { gte: desde },
  };
}

// ── GET /api/v1/balance/dia ─────────────────────────────────────────────────────
// Totales de hoy (Bogotá) + comparativa porcentual de ingresos contra ayer.
export async function getBalanceDia(req: Request, res: Response): Promise<void> {
  try {
    const ahora = new Date();
    const inicioHoy = inicioDiaBogota(ahora);
    const inicioManana = addDias(inicioHoy, 1);
    const inicioAyer = addDias(inicioHoy, -1);

    const campos = { _sum: { valor_cop: true, km_recorrido: true, tiempo_total_min: true }, _count: true } as const;

    const [hoy, ayer] = await Promise.all([
      prisma.viaje.aggregate({ where: whereConductorAceptados(req.conductor_id, inicioHoy, inicioManana), ...campos }),
      prisma.viaje.aggregate({ where: whereConductorAceptados(req.conductor_id, inicioAyer, inicioHoy), ...campos }),
    ]);

    const totalHoy = hoy._sum.valor_cop ?? 0;
    const totalAyer = ayer._sum.valor_cop ?? 0;

    // Si ayer fue 0: 100% si hoy hay ingresos, 0% si tampoco hubo.
    const comparativaAyerPct =
      totalAyer === 0
        ? totalHoy > 0 ? 100 : 0
        : Math.round(((totalHoy - totalAyer) / totalAyer) * 100);

    res.json({
      fecha: partesDiaBogota(inicioHoy).fecha,
      total_cop: totalHoy,
      viajes: hoy._count,
      km_total: hoy._sum.km_recorrido ?? 0,
      tiempo_total_min: hoy._sum.tiempo_total_min ?? 0,
      comparativa_ayer_pct: comparativaAyerPct,
    });
  } catch (error) {
    logger.error('Error en getBalanceDia:', { error });
    res.status(500).json({ error: 'error_interno', message: 'No se pudo obtener el balance del día.' });
  }
}

// Fila agregada por día que devuelve la consulta SQL. Los casts evitan BigInt en COUNT/SUM.
interface FilaDia {
  fecha: string;
  total_cop: number;
  viajes: number;
  km_total: number;
  tiempo_total_min: number;
}

// ── GET /api/v1/balance/semana ──────────────────────────────────────────────────
// Últimos 7 días (incluyendo hoy) agrupados por día calendario de Bogotá.
// Agrupación hecha en PostgreSQL con date_trunc AT TIME ZONE — una sola consulta.
export async function getBalanceSemana(req: Request, res: Response): Promise<void> {
  try {
    const inicioHoy = inicioDiaBogota(new Date());
    const inicioRango = addDias(inicioHoy, -6); // 7 buckets: hoy + 6 días previos

    const filas = await prisma.$queryRaw<FilaDia[]>`
      SELECT to_char((v.registrado_en AT TIME ZONE 'America/Bogota')::date, 'YYYY-MM-DD') AS fecha,
             COALESCE(SUM(v.valor_cop), 0)::float8       AS total_cop,
             COUNT(*)::int                               AS viajes,
             COALESCE(SUM(v.km_recorrido), 0)::float8    AS km_total,
             COALESCE(SUM(v.tiempo_total_min), 0)::int   AS tiempo_total_min
      FROM viajes v
      JOIN turnos t ON t.id = v.turno_id
      WHERE t.conductor_id = ${req.conductor_id}
        AND v.aceptado = true
        AND v.registrado_en >= ${inicioRango}
      GROUP BY fecha
      ORDER BY fecha ASC;
    `;

    const porFecha = new Map(filas.map((f) => [f.fecha, f]));

    // Rellena los 7 días en orden, incluyendo los que no tuvieron viajes (en cero).
    const dias = Array.from({ length: 7 }, (_, i) => {
      const { fecha, dia } = partesDiaBogota(addDias(inicioRango, i));
      const fila = porFecha.get(fecha);
      return {
        fecha,
        dia,
        total_cop: fila?.total_cop ?? 0,
        viajes: fila?.viajes ?? 0,
        km_total: fila?.km_total ?? 0,
        tiempo_total_min: fila?.tiempo_total_min ?? 0,
      };
    });

    const acumular = (campo: keyof FilaDia) => dias.reduce((s, d) => s + (d[campo] as number), 0);

    res.json({
      desde: partesDiaBogota(inicioRango).fecha,
      hasta: partesDiaBogota(inicioHoy).fecha,
      total_cop: acumular('total_cop'),
      viajes: acumular('viajes'),
      km_total: acumular('km_total'),
      tiempo_total_min: acumular('tiempo_total_min'),
      dias,
    });
  } catch (error) {
    logger.error('Error en getBalanceSemana:', { error });
    res.status(500).json({ error: 'error_interno', message: 'No se pudo obtener el balance semanal.' });
  }
}
