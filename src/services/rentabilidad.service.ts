/**
 * RentabilidadService
 * Calcula rentabilidad de servicios de transporte
 *
 * Fórmula: rentabilidad_cop_km = valor_cop / km_recorrido
 * Semáforo: Compara contra umbrales del conductor
 */

export interface CalculoRentabilidad {
  rentabilidad_cop_km: number;
  semaforo: 'VERDE' | 'AMARILLO' | 'ROJO';
  porcentaje_vs_umbral: number;
  mensaje: string;
}

export interface UmbralesConductor {
  umbral_verde_copkm: number;
  umbral_amarillo_copkm: number;
}

export class RentabilidadService {
  /**
   * Calcula rentabilidad de un servicio basado en umbrales del conductor
   *
   * @param valor_cop - Valor del servicio en pesos colombianos
   * @param km_recorrido - Kilómetros a recorrer
   * @param conductor - Objeto con umbrales personalizados del conductor
   * @returns CalculoRentabilidad con semáforo, rentabilidad y mensaje
   * @throws Error si km_recorrido <= 0 o valor_cop < 0
   */
  static calcular(
    valor_cop: number,
    km_recorrido: number,
    conductor: UmbralesConductor,
  ): CalculoRentabilidad {
    // ─── VALIDACIONES ───────────────────────────────────────────────

    if (km_recorrido <= 0) {
      throw new Error('km_recorrido debe ser mayor a 0');
    }

    if (valor_cop < 0) {
      throw new Error('valor_cop no puede ser negativo');
    }

    if (conductor.umbral_verde_copkm <= 0) {
      throw new Error('umbral_verde_copkm debe ser > 0');
    }

    if (conductor.umbral_amarillo_copkm <= 0) {
      throw new Error('umbral_amarillo_copkm debe ser > 0');
    }

    // ─── CÁLCULO ────────────────────────────────────────────────────

    const rentabilidad_cop_km = valor_cop / km_recorrido;

    // ─── DETERMINAR SEMÁFORO ────────────────────────────────────────

    let semaforo: 'VERDE' | 'AMARILLO' | 'ROJO';
    let porcentaje_vs_umbral: number;
    let mensaje: string;

    if (rentabilidad_cop_km >= conductor.umbral_verde_copkm) {
      // VERDE: Excelente servicio
      semaforo = 'VERDE';
      porcentaje_vs_umbral = Math.round(
        (rentabilidad_cop_km / conductor.umbral_verde_copkm) * 100,
      );
      mensaje = `Excelente servicio ($${Math.round(rentabilidad_cop_km).toLocaleString('es-CO')} COP/km)`;
    } else if (rentabilidad_cop_km >= conductor.umbral_amarillo_copkm) {
      // AMARILLO: Servicio regular
      semaforo = 'AMARILLO';
      porcentaje_vs_umbral = Math.round(
        (rentabilidad_cop_km / conductor.umbral_amarillo_copkm) * 100,
      );
      mensaje = `Servicio regular ($${Math.round(rentabilidad_cop_km).toLocaleString('es-CO')} COP/km)`;
    } else {
      // ROJO: Poco rentable
      semaforo = 'ROJO';
      porcentaje_vs_umbral = Math.round(
        (rentabilidad_cop_km / conductor.umbral_amarillo_copkm) * 100,
      );
      mensaje = `Poco rentable ($${Math.round(rentabilidad_cop_km).toLocaleString('es-CO')} COP/km)`;
    }

    return {
      rentabilidad_cop_km,
      semaforo,
      porcentaje_vs_umbral,
      mensaje,
    };
  }
}
