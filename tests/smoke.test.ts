// El mock debe declararse antes de importar la app (jest lo iza al tope).
// Hace que verifyIdToken devuelva { uid: <token> }, así el Bearer token elige conductor.
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
import {
  CONDUCTOR_A_UID,
  CONDUCTOR_B_UID,
  CONDUCTOR_B_ID,
  TURNO_FIN_ID,
  VIAJE_DETALLE_ID,
} from './fixtures';

const API = '/api/v1';
const asA = () => `Bearer ${CONDUCTOR_A_UID}`;
const asB = () => `Bearer ${CONDUCTOR_B_UID}`;

describe('Smoke-test Sprint 2 — Turnos / Balance / Viajes', () => {
  let plataformaId: string;
  let turnoBId: string;

  beforeAll(async () => {
    const didi = await prisma.plataforma.findFirst({ where: { nombre: 'DiDi' } });
    if (!didi) throw new Error('Falta sembrar plataformas. Ejecuta `npm run seed` primero.');
    plataformaId = didi.id;
  });

  afterAll(async () => {
    // Limpia el turno creado por el conductor B durante el ciclo de vida
    await prisma.viaje.deleteMany({ where: { turno: { conductor_id: CONDUCTOR_B_ID } } });
    await prisma.pausa.deleteMany({ where: { turno: { conductor_id: CONDUCTOR_B_ID } } });
    await prisma.turno.deleteMany({ where: { conductor_id: CONDUCTOR_B_ID } });
    await prisma.$disconnect();
  });

  // ── Ciclo de vida del turno (conductor B, limpio) ──────────────────────────────

  it('POST /turnos/iniciar → 201 crea turno ACTIVO', async () => {
    const res = await request(app).post(`${API}/turnos/iniciar`).set('Authorization', asB());
    expect(res.status).toBe(201);
    expect(res.body.estado).toBe('ACTIVO');
    turnoBId = res.body.id;
  });

  it('GET /turnos/activo → 200 retorna el turno activo', async () => {
    const res = await request(app).get(`${API}/turnos/activo`).set('Authorization', asB());
    expect(res.status).toBe(200);
    expect(res.body?.id).toBe(turnoBId);
    expect(res.body?.estado).toBe('ACTIVO');
  });

  it('PUT /turnos/:id/pausar → 200 pasa a PAUSADO', async () => {
    const res = await request(app).put(`${API}/turnos/${turnoBId}/pausar`).set('Authorization', asB());
    expect(res.status).toBe(200);
    expect(res.body.estado).toBe('PAUSADO');
  });

  it('PUT /turnos/:id/reanudar → 200 vuelve a ACTIVO', async () => {
    const res = await request(app).put(`${API}/turnos/${turnoBId}/reanudar`).set('Authorization', asB());
    expect(res.status).toBe(200);
    expect(res.body.estado).toBe('ACTIVO');
  });

  it('PUT /turnos/:id/finalizar → 200 calcula totales', async () => {
    // Inserta 2 viajes (1 aceptado $5000 / 2km, 1 rechazado) para verificar los cálculos
    await prisma.viaje.createMany({
      data: [
        {
          turno_id: turnoBId, plataforma_id: plataformaId,
          valor_cop: 5000, km_recogida: 1, km_recorrido: 2, tiempo_recogida_min: 3, tiempo_total_min: 12,
          km_total: 3, valor_copkm: 2500, semaforo: 'VERDE', porcentaje_vs_umbral: 66, aceptado: true,
        },
        {
          turno_id: turnoBId, plataforma_id: plataformaId,
          valor_cop: 1500, km_recogida: 1, km_recorrido: 3, tiempo_recogida_min: 5, tiempo_total_min: 14,
          km_total: 4, valor_copkm: 500, semaforo: 'ROJO', porcentaje_vs_umbral: -66, aceptado: false,
        },
      ],
    });

    const res = await request(app).put(`${API}/turnos/${turnoBId}/finalizar`).set('Authorization', asB());
    expect(res.status).toBe(200);
    expect(res.body.estado).toBe('FINALIZADO');
    expect(res.body.total_viajes).toBe(2);
    expect(res.body.viajes_aceptados).toBe(1);
    expect(res.body.viajes_rechazados).toBe(1);
    expect(res.body.ingreso_total_cop).toBe(5000); // solo el aceptado
    expect(res.body.km_totales).toBe(2);
    expect(res.body.fin).toBeTruthy();
  });

  it('GET /turnos/:id → 200 detalle del turno (finalizado sembrado)', async () => {
    const res = await request(app).get(`${API}/turnos/${TURNO_FIN_ID}`).set('Authorization', asA());
    expect(res.status).toBe(200);
    expect(res.body.id).toBe(TURNO_FIN_ID);
    expect(res.body.estado).toBe('FINALIZADO');
    expect(Array.isArray(res.body.viajes)).toBe(true);
    expect(res.body.viajes.length).toBeGreaterThan(0);
  });

  // ── Lecturas con datos (conductor A) ───────────────────────────────────────────

  it('GET /balance/dia → 200 con stats del día', async () => {
    const res = await request(app).get(`${API}/balance/dia`).set('Authorization', asA());
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('total_cop');
    expect(res.body).toHaveProperty('viajes');
    expect(res.body).toHaveProperty('km_total');
    expect(res.body).toHaveProperty('tiempo_total_min');
    expect(res.body).toHaveProperty('comparativa_ayer_pct');
  });

  it('GET /balance/semana → 200 con 7 días', async () => {
    const res = await request(app).get(`${API}/balance/semana`).set('Authorization', asA());
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.dias)).toBe(true);
    expect(res.body.dias).toHaveLength(7);
    expect(res.body).toHaveProperty('total_cop');
  });

  it('GET /viajes?page=1&limit=10 → 200 lista paginada', async () => {
    const res = await request(app).get(`${API}/viajes?page=1&limit=10`).set('Authorization', asA());
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.viajes)).toBe(true);
    expect(res.body.viajes.length).toBeGreaterThan(0);
    expect(res.body).toMatchObject({ page: 1, limit: 10 });
    expect(res.body).toHaveProperty('has_more');
  });

  it('GET /viajes/:id → 200 detalle del viaje', async () => {
    const res = await request(app).get(`${API}/viajes/${VIAJE_DETALLE_ID}`).set('Authorization', asA());
    expect(res.status).toBe(200);
    expect(res.body.id).toBe(VIAJE_DETALLE_ID);
    expect(res.body).toHaveProperty('semaforo');
    expect(res.body).toHaveProperty('plataforma');
  });
});
