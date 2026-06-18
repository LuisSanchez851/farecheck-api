// IDs y UIDs fijos compartidos entre el seed de smoke-test y la suite de tests.
// El mock de Firebase usa el Bearer token COMO uid, así que el header
// `Authorization: Bearer <UID>` selecciona el conductor de cada request.

// Conductor A — tiene datos sembrados (turno finalizado + activo + 10 viajes).
// Se usa para los endpoints de lectura (balance, viajes, detalle).
export const CONDUCTOR_A_UID = 'smoke-conductor-a';
export const CONDUCTOR_A_ID = '11111111-1111-4111-8111-111111111111';

// Conductor B — limpio (sin turnos). Se usa para el ciclo de vida del turno
// (iniciar → pausar → reanudar → finalizar), que exige que no haya turno abierto.
export const CONDUCTOR_B_UID = 'smoke-conductor-b';
export const CONDUCTOR_B_ID = '22222222-2222-4222-8222-222222222222';

// Turnos sembrados de A
export const TURNO_FIN_ID = '33333333-3333-4333-8333-333333333333'; // FINALIZADO
export const TURNO_ACT_ID = '44444444-4444-4444-8444-444444444444'; // ACTIVO

// Viaje sembrado de A usado para GET /viajes/:id
export const VIAJE_DETALLE_ID = '55555555-5555-4555-8555-555555555555';
