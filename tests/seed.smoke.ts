import { PrismaClient } from '@prisma/client';
import 'dotenv/config';
import {
  CONDUCTOR_A_UID, CONDUCTOR_A_ID,
  CONDUCTOR_B_UID, CONDUCTOR_B_ID,
  TURNO_FIN_ID, TURNO_ACT_ID, VIAJE_DETALLE_ID,
} from './fixtures';

const prisma = new PrismaClient();

// Fecha de hace `n` días, a la hora indicada (hora local).
function diasAtras(n: number, hora = 12, min = 0): Date {
  const d = new Date();
  d.setDate(d.getDate() - n);
  d.setHours(hora, min, 0, 0);
  return d;
}

type Semaforo = 'VERDE' | 'AMARILLO' | 'ROJO';

// Construye un viaje con los campos derivados (semáforo, COP/km, etc.) calculados.
function viaje(opts: {
  turno_id: string;
  plataforma_id: string;
  valor_cop: number;
  km_recorrido: number;
  aceptado: boolean;
  registrado_en: Date;
  id?: string;
}) {
  const km_recogida = 1.5;
  const km_total = +(km_recogida + opts.km_recorrido).toFixed(2);
  const valor_copkm = Math.round(opts.valor_cop / opts.km_recorrido);
  const semaforo: Semaforo = valor_copkm >= 1500 ? 'VERDE' : valor_copkm >= 900 ? 'AMARILLO' : 'ROJO';
  const porcentaje_vs_umbral = Math.round((valor_copkm / 1500) * 100) - 100;
  return {
    ...(opts.id ? { id: opts.id } : {}),
    turno_id: opts.turno_id,
    plataforma_id: opts.plataforma_id,
    valor_cop: opts.valor_cop,
    km_recogida,
    km_recorrido: opts.km_recorrido,
    tiempo_recogida_min: 4,
    tiempo_total_min: 18,
    km_total,
    valor_copkm,
    semaforo,
    porcentaje_vs_umbral,
    aceptado: opts.aceptado,
    registrado_en: opts.registrado_en,
  };
}

async function ensurePlataformas() {
  await prisma.plataforma.createMany({
    data: [
      { nombre: 'DiDi',         package_android: 'com.didiglobal.passenger', activa: true },
      { nombre: 'Uber',         package_android: 'com.ubercab.driver',        activa: true },
      { nombre: 'Picap',        package_android: 'com.picap.android',         activa: true },
    ],
    skipDuplicates: true,
  });
}

// Borra todos los datos del conductor (por uid) y lo recrea con id fijo.
async function resetConductor(id: string, firebase_uid: string, nombre: string) {
  const existing = await prisma.conductor.findUnique({ where: { firebase_uid }, select: { id: true } });
  if (existing) {
    const cid = existing.id;
    await prisma.viaje.deleteMany({ where: { turno: { conductor_id: cid } } });
    await prisma.pausa.deleteMany({ where: { turno: { conductor_id: cid } } });
    await prisma.turno.deleteMany({ where: { conductor_id: cid } });
    await prisma.suscripcion.deleteMany({ where: { conductor_id: cid } });
    await prisma.contactoEmergencia.deleteMany({ where: { conductor_id: cid } });
    await prisma.conductor.delete({ where: { id: cid } });
  }
  return prisma.conductor.create({
    data: {
      id,
      firebase_uid,
      auth_provider: 'phone',
      nombre,
      telefono: '+573001112233',
      umbral_verde_copkm: 1500,
      umbral_amarillo_copkm: 900,
    },
  });
}

async function suscripcionActiva(conductor_id: string) {
  const inicio = new Date();
  const fin = new Date();
  fin.setDate(fin.getDate() + 30);
  await prisma.suscripcion.create({
    data: { conductor_id, plan: 'TRIAL', estado: 'ACTIVA', inicio, fin },
  });
}

async function main() {
  await ensurePlataformas();
  const plats = await prisma.plataforma.findMany({ where: { nombre: { in: ['DiDi', 'Uber', 'Picap'] } } });
  const id = Object.fromEntries(plats.map((p) => [p.nombre, p.id])) as Record<string, string>;

  // ── Conductor A (con datos) ──────────────────────────────────────────────────
  const condA = await resetConductor(CONDUCTOR_A_ID, CONDUCTOR_A_UID, 'Carlos Pruebas');
  await suscripcionActiva(condA.id);

  // Turno finalizado (hace 3 días) con totales ya calculados (4 aceptados de 8)
  await prisma.turno.create({
    data: {
      id: TURNO_FIN_ID,
      conductor_id: condA.id,
      inicio: diasAtras(3, 8),
      fin: diasAtras(3, 16),
      estado: 'FINALIZADO',
      total_viajes: 8,
      viajes_aceptados: 4,
      viajes_rechazados: 4,
      ingreso_total_cop: 41000,
      km_totales: 16.7,
      tiempo_activo_min: 480,
      tiempo_pausa_min: 0,
    },
  });

  // Turno activo (hoy) — sus totales se calculan en vivo por el endpoint
  await prisma.turno.create({
    data: { id: TURNO_ACT_ID, conductor_id: condA.id, inicio: diasAtras(0, 7), estado: 'ACTIVO' },
  });

  // 10 viajes (5 aceptados / 5 rechazados), repartidos en los últimos 7 días
  await prisma.viaje.createMany({
    data: [
      // Turno activo (hoy) — 1 aceptado + 1 rechazado
      viaje({ turno_id: TURNO_ACT_ID, plataforma_id: id.DiDi, valor_cop: 9000, km_recorrido: 4, aceptado: true, registrado_en: diasAtras(0, 9) }),
      viaje({ turno_id: TURNO_ACT_ID, plataforma_id: id.Uber, valor_cop: 4000, km_recorrido: 5, aceptado: false, registrado_en: diasAtras(0, 10) }),

      // Turno finalizado — 4 aceptados
      viaje({ turno_id: TURNO_FIN_ID, plataforma_id: id.DiDi, valor_cop: 8000, km_recorrido: 3.2, aceptado: true, registrado_en: diasAtras(3, 8, 30), id: VIAJE_DETALLE_ID }),
      viaje({ turno_id: TURNO_FIN_ID, plataforma_id: id.Uber, valor_cop: 12000, km_recorrido: 5, aceptado: true, registrado_en: diasAtras(2, 14) }),
      viaje({ turno_id: TURNO_FIN_ID, plataforma_id: id.Picap, valor_cop: 6000, km_recorrido: 2.5, aceptado: true, registrado_en: diasAtras(5, 11) }),
      viaje({ turno_id: TURNO_FIN_ID, plataforma_id: id.DiDi, valor_cop: 15000, km_recorrido: 6, aceptado: true, registrado_en: diasAtras(6, 19) }),

      // Turno finalizado — 4 rechazados
      viaje({ turno_id: TURNO_FIN_ID, plataforma_id: id.Uber, valor_cop: 3000, km_recorrido: 4, aceptado: false, registrado_en: diasAtras(1, 7) }),
      viaje({ turno_id: TURNO_FIN_ID, plataforma_id: id.Picap, valor_cop: 2500, km_recorrido: 3, aceptado: false, registrado_en: diasAtras(4, 16) }),
      viaje({ turno_id: TURNO_FIN_ID, plataforma_id: id.DiDi, valor_cop: 3500, km_recorrido: 5, aceptado: false, registrado_en: diasAtras(3, 12) }),
      viaje({ turno_id: TURNO_FIN_ID, plataforma_id: id.Uber, valor_cop: 2000, km_recorrido: 3, aceptado: false, registrado_en: diasAtras(6, 9) }),
    ],
  });

  // ── Conductor B (limpio, para el ciclo de vida del turno) ────────────────────
  const condB = await resetConductor(CONDUCTOR_B_ID, CONDUCTOR_B_UID, 'Beatriz Pruebas');
  await suscripcionActiva(condB.id);

  console.log('✅ Seed de smoke-test listo:');
  console.log(`   Conductor A (${CONDUCTOR_A_UID}): 2 turnos, 10 viajes (5 aceptados / 5 rechazados)`);
  console.log(`   Conductor B (${CONDUCTOR_B_UID}): limpio para el ciclo de turno`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
