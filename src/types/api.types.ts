// Tipos compartidos frontend ↔ backend
// Mantener sincronizado con src/types/api.types.ts del frontend

export interface Conductor {
  id: string;
  firebase_uid: string;
  auth_provider: 'google' | 'phone';
  nombre: string;
  email?: string;
  telefono?: string;
  foto_url?: string;
  placa_vehiculo?: string;
  marca_vehiculo?: string;
  modelo_vehiculo?: string;
  anio_vehiculo?: number;
  umbral_verde_copkm: number;
  umbral_amarillo_copkm: number;
  creado_en: string;
}

export interface RegistroBody {
  firebase_token: string;
  nombre: string;
  telefono?: string;
  placa_vehiculo?: string;
  marca_vehiculo?: string;
  modelo_vehiculo?: string;
}

export interface LoginBody {
  firebase_token: string;
}

export interface UpdatePerfilBody {
  nombre?: string;
  foto_url?: string;
  placa_vehiculo?: string;
  marca_vehiculo?: string;
  modelo_vehiculo?: string;
  anio_vehiculo?: number;
}

export interface UpdateUmbralesBody {
  umbral_verde_copkm: number;
  umbral_amarillo_copkm: number;
}

export type EstadoTurno = 'ACTIVO' | 'PAUSADO' | 'FINALIZADO';

export interface AnalisisInput {
  valor_cop: number;
  km_recogida: number;
  km_recorrido: number;
  tiempo_recogida_min: number;
  tiempo_total_min: number;
  plataforma_id: string;
  turno_id: string;
  calificacion_pasajero?: number;
  viajes_pasajero?: number;
}

export type Semaforo = 'VERDE' | 'AMARILLO' | 'ROJO';

export interface AnalisisOutput {
  semaforo: Semaforo;
  valor_copkm: number;
  km_total: number;
  tiempo_total_min: number;
  porcentaje_vs_umbral: number;
  viaje_id: string;
}

export interface ApiError {
  error: string;
  message: string;
}

export const API_ERRORS = {
  SUSCRIPCION_REQUERIDA:    'suscripcion_requerida',
  CONDUCTOR_NO_ENCONTRADO:  'conductor_no_encontrado',
  TURNO_NO_ENCONTRADO:      'turno_no_encontrado',
  TURNO_NO_ACTIVO:          'turno_no_activo',
  VIAJE_NO_ENCONTRADO:      'viaje_no_encontrado',
  TURNO_YA_ACTIVO:          'turno_ya_activo',
  TOKEN_INVALIDO:           'token_invalido',
  TOKEN_EXPIRADO:           'token_expirado',
  RATE_LIMIT:               'rate_limit_exceeded',
  PARSEO_FALLIDO:           'parseo_fallido',
  VALIDACION_FALLIDA:       'validacion_fallida',
} as const;
