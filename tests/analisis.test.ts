// Mismo mock de Firebase que smoke.test: el Bearer token se usa como uid.
jest.mock('../src/services/firebase.service', () => ({
  admin: {
    auth: () => ({
      verifyIdToken: async (token: string) => ({ uid: token }),
    }),
  },
}));

import request from 'supertest';
import app from '../src/index';
import { prisma } from '../src/prisma/client';
import { CONDUCTOR_B_UID, CONDUCTOR_B_ID } from './fixtures';

const API = '/api/v1';
const asB = () => `Bearer ${CONDUCTOR_B_UID}`;

// Conductor B parte limpio (sin turnos). Le creamos un turno activo propio para
// no contaminar los datos sembrados del conductor A.
describe('Sprint 3-01 — POST /analisis (motor de semáforo)', () => {
  let plataformaId: string;
  let turnoId: string;

  async function limpiarB() {
    await prisma.viaje.deleteMany({ where: { turno: { conductor_id: CONDUCTOR_B_ID } } });
    await prisma.pausa.deleteMany({ where: { turno: { conductor_id: CONDUCTOR_B_ID } } });
    await prisma.turno.deleteMany({ where: { conductor_id: CONDUCTOR_B_ID } });
  }

  beforeAll(async () => {
    const didi = await prisma.plataforma.findFirst({ where: { nombre: 'DiDi' } });
    if (!didi) throw new Error('Falta sembrar plataformas. Ejecuta `npm run seed` primero.');
    plataformaId = didi.id;

    await limpiarB();
    const turno = await prisma.turno.create({
      data: { conductor_id: CONDUCTOR_B_ID, inicio: new Date(), estado: 'ACTIVO' },
    });
    turnoId = turno.id;
  });

  afterAll(async () => {
    await limpiarB();
    await prisma.$disconnect();
  });

  const post = (body: Record<string, unknown>) =>
    request(app).post(`${API}/analisis`).set('Authorization', asB()).send(body);

  it('VERDE → copkm ≥ umbral verde (1500)', async () => {
    const res = await post({ valor_cop: 12000, km_recorrido: 4, plataforma_id: plataformaId, turno_id: turnoId });
    expect(res.status).toBe(201);
    expect(res.body.semaforo).toBe('VERDE');
    expect(res.body.valor_copkm).toBe(3000);
    expect(res.body).toHaveProperty('viaje_id');
    expect(res.body.mensaje).toBe('Buen servicio');
  });

  it('AMARILLO → entre umbral amarillo (900) y verde (1500)', async () => {
    const res = await post({ valor_cop: 5000, km_recorrido: 4, plataforma_id: plataformaId, turno_id: turnoId });
    expect(res.status).toBe(201);
    expect(res.body.semaforo).toBe('AMARILLO'); // 1250 copkm
  });

  it('ROJO → copkm < umbral amarillo (900)', async () => {
    const res = await post({ valor_cop: 2000, km_recorrido: 5, plataforma_id: plataformaId, turno_id: turnoId });
    expect(res.status).toBe(201);
    expect(res.body.semaforo).toBe('ROJO'); // 400 copkm
    expect(res.body.mensaje).toBe('Servicio no rentable');
  });

  it('400 cuando km_recorrido = 0 (evita división por cero)', async () => {
    const res = await post({ valor_cop: 5000, km_recorrido: 0, plataforma_id: plataformaId, turno_id: turnoId });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('validacion_fallida');
  });

  it('404 cuando el turno no pertenece al conductor', async () => {
    const res = await post({
      valor_cop: 5000, km_recorrido: 3, plataforma_id: plataformaId,
      turno_id: '00000000-0000-4000-8000-000000000000',
    });
    expect(res.status).toBe(404);
    expect(res.body.error).toBe('turno_no_encontrado');
  });

  // ── PATCH /analisis/:viaje_id/decision (S3-02b) ──────────────────────────────

  // Analiza una oferta y devuelve el viaje_id creado (para luego decidir sobre él).
  async function crearViaje(): Promise<string> {
    const res = await post({ valor_cop: 8000, km_recorrido: 4, plataforma_id: plataformaId, turno_id: turnoId });
    return res.body.viaje_id as string;
  }

  const patchDecision = (viajeId: string, body: Record<string, unknown>) =>
    request(app).patch(`${API}/analisis/${viajeId}/decision`).set('Authorization', asB()).send(body);

  it('PATCH decision "aceptado" → 200 y viajes.aceptado = true', async () => {
    const viajeId = await crearViaje();
    const res = await patchDecision(viajeId, { decision: 'aceptado' });

    expect(res.status).toBe(200);
    expect(res.body.viaje_id).toBe(viajeId);
    expect(res.body.decision).toBe('aceptado');
    expect(res.body).toHaveProperty('semaforo_al_momento');
    expect(res.body).toHaveProperty('mensaje');

    const viaje = await prisma.viaje.findUnique({ where: { id: viajeId }, select: { aceptado: true } });
    expect(viaje?.aceptado).toBe(true);
  });

  it('PATCH decision "rechazado" → 200 y viajes.aceptado = false', async () => {
    const viajeId = await crearViaje();
    const res = await patchDecision(viajeId, { decision: 'rechazado' });

    expect(res.status).toBe(200);
    expect(res.body.decision).toBe('rechazado');

    const viaje = await prisma.viaje.findUnique({ where: { id: viajeId }, select: { aceptado: true } });
    expect(viaje?.aceptado).toBe(false);
  });

  it('PATCH → 404 cuando el viaje no existe (o no es del conductor)', async () => {
    const res = await patchDecision('00000000-0000-4000-8000-000000000000', { decision: 'aceptado' });
    expect(res.status).toBe(404);
    expect(res.body.error).toBe('viaje_no_encontrado');
  });
});
