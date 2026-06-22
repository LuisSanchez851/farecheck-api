import { RentabilidadService, UmbralesConductor } from '../rentabilidad.service';

// Umbrales estándar usados por la mayoría de los casos.
const umbrales: UmbralesConductor = {
  umbral_verde_copkm: 1500,
  umbral_amarillo_copkm: 900,
};

// Formatea un valor igual que el servicio (es-CO usa '.' como separador de miles),
// para que las aserciones de mensaje no dependan del entorno.
const fmt = (n: number) => Math.round(n).toLocaleString('es-CO');

describe('RentabilidadService', () => {
  // ── Casos del semáforo ─────────────────────────────────────────────────────
  describe('semáforo', () => {
    it('clasifica VERDE cuando la rentabilidad supera el umbral verde', () => {
      const r = RentabilidadService.calcular(12500, 4.3, umbrales);

      expect(r.semaforo).toBe('VERDE');
      expect(r.rentabilidad_cop_km).toBeCloseTo(2906.98, 2);
      expect(r.porcentaje_vs_umbral).toBe(194);
    });

    it('clasifica AMARILLO cuando está entre el umbral amarillo y el verde', () => {
      const r = RentabilidadService.calcular(5000, 5, umbrales);

      expect(r.semaforo).toBe('AMARILLO');
      expect(r.rentabilidad_cop_km).toBe(1000);
      expect(r.porcentaje_vs_umbral).toBe(111);
    });

    it('clasifica ROJO cuando está por debajo del umbral amarillo', () => {
      const r = RentabilidadService.calcular(3000, 5, umbrales);

      expect(r.semaforo).toBe('ROJO');
      expect(r.rentabilidad_cop_km).toBe(600);
      expect(r.porcentaje_vs_umbral).toBe(67);
    });

    it('clasifica VERDE en el límite exacto del umbral verde (>=)', () => {
      const r = RentabilidadService.calcular(1500, 1, umbrales);

      expect(r.semaforo).toBe('VERDE');
      expect(r.rentabilidad_cop_km).toBe(1500);
      expect(r.porcentaje_vs_umbral).toBe(100);
    });

    it('clasifica AMARILLO en el límite exacto del umbral amarillo (>=)', () => {
      const r = RentabilidadService.calcular(900, 1, umbrales);

      expect(r.semaforo).toBe('AMARILLO');
      expect(r.rentabilidad_cop_km).toBe(900);
      expect(r.porcentaje_vs_umbral).toBe(100);
    });
  });

  // ── Validaciones / edge cases ──────────────────────────────────────────────
  describe('validaciones y edge cases', () => {
    it('lanza error si km_recorrido es 0', () => {
      expect(() => RentabilidadService.calcular(5000, 0, umbrales)).toThrow(
        'km_recorrido debe ser mayor a 0',
      );
    });

    it('lanza error si km_recorrido es negativo', () => {
      expect(() => RentabilidadService.calcular(5000, -3, umbrales)).toThrow(
        'km_recorrido debe ser mayor a 0',
      );
    });

    it('lanza error si valor_cop es negativo', () => {
      expect(() => RentabilidadService.calcular(-500, 5, umbrales)).toThrow(
        'valor_cop no puede ser negativo',
      );
    });

    it('lanza error si umbral_verde_copkm no es positivo', () => {
      expect(() =>
        RentabilidadService.calcular(5000, 5, { umbral_verde_copkm: 0, umbral_amarillo_copkm: 900 }),
      ).toThrow('umbral_verde_copkm debe ser > 0');
    });

    it('lanza error si umbral_amarillo_copkm no es positivo', () => {
      expect(() =>
        RentabilidadService.calcular(5000, 5, { umbral_verde_copkm: 1500, umbral_amarillo_copkm: 0 }),
      ).toThrow('umbral_amarillo_copkm debe ser > 0');
    });

    it('permite valor_cop = 0 (caso ROJO, sin error)', () => {
      const r = RentabilidadService.calcular(0, 5, umbrales);

      expect(r.semaforo).toBe('ROJO');
      expect(r.rentabilidad_cop_km).toBe(0);
      expect(r.porcentaje_vs_umbral).toBe(0);
    });

    it('maneja rentabilidad muy alta sin overflow (50000 / 1)', () => {
      const r = RentabilidadService.calcular(50000, 1, umbrales);

      expect(r.semaforo).toBe('VERDE');
      expect(r.rentabilidad_cop_km).toBe(50000);
      expect(r.porcentaje_vs_umbral).toBe(3333);
      expect(Number.isFinite(r.rentabilidad_cop_km)).toBe(true);
    });

    it('maneja rentabilidad muy baja (100 / 100 = 1 COP/km, ROJO)', () => {
      const r = RentabilidadService.calcular(100, 100, umbrales);

      expect(r.semaforo).toBe('ROJO');
      expect(r.rentabilidad_cop_km).toBe(1);
      expect(r.porcentaje_vs_umbral).toBe(0);
    });
  });

  // ── Cálculo del porcentaje ─────────────────────────────────────────────────
  describe('porcentaje_vs_umbral', () => {
    it('siempre devuelve un entero (redondeado)', () => {
      const verde = RentabilidadService.calcular(12500, 4.3, umbrales);
      const amarillo = RentabilidadService.calcular(5000, 5, umbrales);
      const rojo = RentabilidadService.calcular(3000, 5, umbrales);

      expect(Number.isInteger(verde.porcentaje_vs_umbral)).toBe(true);
      expect(Number.isInteger(amarillo.porcentaje_vs_umbral)).toBe(true);
      expect(Number.isInteger(rojo.porcentaje_vs_umbral)).toBe(true);
    });

    it('usa el umbral VERDE como base cuando el semáforo es VERDE', () => {
      const r = RentabilidadService.calcular(3000, 1, umbrales); // 3000 / 1500 = 200%
      expect(r.semaforo).toBe('VERDE');
      expect(r.porcentaje_vs_umbral).toBe(200);
    });

    it('usa el umbral AMARILLO como base cuando el semáforo es AMARILLO o ROJO', () => {
      const amarillo = RentabilidadService.calcular(1350, 1, umbrales); // 1350 / 900 = 150%
      const rojo = RentabilidadService.calcular(450, 1, umbrales); // 450 / 900 = 50%

      expect(amarillo.semaforo).toBe('AMARILLO');
      expect(amarillo.porcentaje_vs_umbral).toBe(150);
      expect(rojo.semaforo).toBe('ROJO');
      expect(rojo.porcentaje_vs_umbral).toBe(50);
    });
  });

  // ── Mensaje ────────────────────────────────────────────────────────────────
  describe('mensaje', () => {
    it('incluye el valor formateado como "$X COP/km"', () => {
      const r = RentabilidadService.calcular(12500, 4.3, umbrales);
      expect(r.mensaje).toMatch(/\$[\d.,]+ COP\/km/);
      expect(r.mensaje).toContain(`$${fmt(r.rentabilidad_cop_km)} COP/km`);
    });

    it('usa "Excelente servicio" para VERDE', () => {
      const r = RentabilidadService.calcular(12500, 4.3, umbrales);
      expect(r.mensaje).toBe(`Excelente servicio ($${fmt(r.rentabilidad_cop_km)} COP/km)`);
    });

    it('usa "Servicio regular" para AMARILLO', () => {
      const r = RentabilidadService.calcular(5000, 5, umbrales);
      expect(r.mensaje).toBe(`Servicio regular ($${fmt(r.rentabilidad_cop_km)} COP/km)`);
    });

    it('usa "Poco rentable" para ROJO', () => {
      const r = RentabilidadService.calcular(3000, 5, umbrales);
      expect(r.mensaje).toBe(`Poco rentable ($${fmt(r.rentabilidad_cop_km)} COP/km)`);
    });
  });
});
