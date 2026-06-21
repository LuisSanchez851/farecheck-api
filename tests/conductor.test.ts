// Mock de Firebase Admin: verifyIdToken(token) → { uid: token }, así el firebase_token
// enviado en el body actúa como el uid (igual que en el resto de smoke-tests).
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
import { CONDUCTOR_A_UID } from './fixtures';

const API = '/api/v1';

describe('Sprint 1 — POST /conductor/crear (registro)', () => {
  const nuevoUid = `crear-test-${Date.now()}`;

  afterAll(async () => {
    // Limpia el conductor creado en la prueba "ok".
    const c = await prisma.conductor.findUnique({ where: { firebase_uid: nuevoUid }, select: { id: true } });
    if (c) {
      await prisma.suscripcion.deleteMany({ where: { conductor_id: c.id } });
      await prisma.conductor.delete({ where: { id: c.id } });
    }
    await prisma.$disconnect();
  });

  const crear = (body: Record<string, unknown>) =>
    request(app).post(`${API}/conductor/crear`).send(body);

  it('crea el conductor con suscripción TRIAL activa → 201', async () => {
    const res = await crear({
      firebase_token: nuevoUid,
      nombre: 'Nuevo Conductor',
      telefono: '+573009998877',
    });

    expect(res.status).toBe(201);
    expect(res.body.conductor).toBeDefined();
    expect(res.body.conductor.nombre).toBe('Nuevo Conductor');
    expect(res.body.conductor.firebase_uid).toBe(nuevoUid);
    expect(res.body.suscripcion.estado).toBe('ACTIVA');
    expect(res.body.suscripcion.plan).toBe('TRIAL');
    expect(res.body.suscripcion_activa).toBe(true);
  });

  it('rechaza si el firebase_uid ya existe → 409', async () => {
    const res = await crear({ firebase_token: CONDUCTOR_A_UID, nombre: 'Carlos Duplicado' });
    expect(res.status).toBe(409);
    expect(res.body.error).toBe('conductor_ya_existe');
  });

  it('rechaza datos faltantes (sin nombre) → 400', async () => {
    const res = await crear({ firebase_token: nuevoUid });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('validacion_fallida');
  });
});
