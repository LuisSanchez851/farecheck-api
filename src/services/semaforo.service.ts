// ⚠️  LÓGICA PROTEGIDA — NUNCA exponer al cliente (APK/IPA)
// Los umbrales se leen de PostgreSQL — el cliente solo recibe el resultado final.

import { prisma } from '../prisma/client';
import { AnalisisInput, AnalisisOutput, Semaforo } from '../types/api.types';

export async function analizarServicio(
  input: AnalisisInput,
  conductor_id: string,
): Promise<AnalisisOutput> {

  // 1. Leer umbrales del conductor desde PostgreSQL (personalizados o por defecto)
  const conductor = await prisma.conductor.findUnique({
    where: { id: conductor_id },
    select: {
      umbral_verde_copkm:    true,
      umbral_amarillo_copkm: true,
    },
  });

  if (!conductor) throw new Error('Conductor no encontrado al analizar servicio');

  const { umbral_verde_copkm, umbral_amarillo_copkm } = conductor;

  // 2. Calcular métricas
  const km_total    = input.km_recogida + input.km_recorrido;
  // El valor/km se calcula sobre km PAGADOS — los de recogida son costo del conductor
  const valor_copkm = Math.round(input.valor_cop / input.km_recorrido);
  const tiempo_total_min = input.tiempo_recogida_min + input.tiempo_total_min;

  // 3. Clasificar
  let semaforo: Semaforo;
  if (valor_copkm >= umbral_verde_copkm) {
    semaforo = 'VERDE';
  } else if (valor_copkm >= umbral_amarillo_copkm) {
    semaforo = 'AMARILLO';
  } else {
    semaforo = 'ROJO';
  }

  // 4. % vs umbral verde (positivo = sobre umbral, negativo = bajo rojo)
  const porcentaje_vs_umbral = Math.round(
    ((valor_copkm - umbral_verde_copkm) / umbral_verde_copkm) * 100,
  );

  // 5. Persistir servicio (aceptado = null hasta que el conductor confirme)
  const viaje = await prisma.servicio.create({
    data: {
      turno_id:             input.turno_id,
      plataforma_id:        input.plataforma_id,
      valor_cop:            input.valor_cop,
      km_recogida:          input.km_recogida,
      km_recorrido:         input.km_recorrido,
      km_total,
      tiempo_recogida_min:  input.tiempo_recogida_min,
      tiempo_total_min,
      calificacion_pasajero: input.calificacion_pasajero,
      viajes_pasajero:       input.viajes_pasajero,
      valor_copkm,
      semaforo,
      porcentaje_vs_umbral,
      aceptado: null,
    },
  });

  // 6. Devolver resultado — NO incluir umbrales del conductor
  return { semaforo, valor_copkm, km_total, tiempo_total_min, porcentaje_vs_umbral, viaje_id: viaje.id };
}

export function formatearCOP(valor: number): string {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency', currency: 'COP',
    minimumFractionDigits: 0, maximumFractionDigits: 0,
  }).format(valor);
}

export function getSemaforoMensaje(semaforo: Semaforo): string {
  return { VERDE: 'Buen servicio', AMARILLO: 'Evalúa antes de aceptar', ROJO: 'Servicio no rentable' }[semaforo];
}
