# FASE 2 - PASO 3: RentabilidadService
## Especificación Detallada

**Status**: 📋 Documentación  
**Prerequisito**: PASO 1 completado ✅ (PASO 2 puede ser en paralelo)  
**Objetivo**: Crear servicio que calcula rentabilidad y semáforo  
**Tiempo estimado**: 30 min  
**Complejidad**: ⭐⭐ Baja  

---

## 🎯 Qué Hay Que Hacer

Crear archivo `src/services/rentabilidad.service.ts` con lógica de cálculo:

```
Input: valor_cop, km_recorrido, umbrales_conductor
  ↓
Calcula: rentabilidad = valor_cop / km_recorrido
  ↓
Compara: rentabilidad vs umbrales
  ↓
Output: {rentabilidad_cop_km, semaforo, porcentaje_vs_umbral, mensaje}
```

---

## 📐 Fórmula

### Rentabilidad
```
rentabilidad_cop_km = valor_cop / km_recorrido

Ejemplo:
  valor_cop = 12.500 COP
  km_recorrido = 4.3 km
  rentabilidad = 12.500 / 4.3 = 2.906 COP/km
```

### Semáforo
```
SI rentabilidad >= umbral_verde_copkm
  → VERDE ("Excelente servicio")

SI umbral_amarillo_copkm <= rentabilidad < umbral_verde_copkm
  → AMARILLO ("Servicio regular")

SI rentabilidad < umbral_amarillo_copkm
  → ROJO ("Poco rentable")
```

### Porcentaje vs Umbral
```
Depende del semáforo:

VERDE: porcentaje = (rentabilidad / umbral_verde) * 100
  Ejemplo: (2906 / 1500) * 100 = 194%

AMARILLO: porcentaje = (rentabilidad / umbral_amarillo) * 100
  Ejemplo: (1000 / 900) * 100 = 111%

ROJO: porcentaje = (rentabilidad / umbral_amarillo) * 100
  Ejemplo: (600 / 900) * 100 = 67%
```

---

## 💻 Archivo Completo

**Ubicación**: `src/services/rentabilidad.service.ts` (NUEVO)

```typescript
/**
 * RentabilidadService
 * Calcula rentabilidad de servicios de transporte
 * 
 * Fórmula: rentabilidad_cop_km = valor_cop / km_recorrido
 * Semáforo: Compara contra umbrales del conductor
 */

interface CalculoRentabilidad {
  rentabilidad_cop_km: number;
  semaforo: 'VERDE' | 'AMARILLO' | 'ROJO';
  porcentaje_vs_umbral: number;
  mensaje: string;
}

interface UmbralesConductor {
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
    conductor: UmbralesConductor
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
        (rentabilidad_cop_km / conductor.umbral_verde_copkm) * 100
      );
      mensaje = `Excelente servicio ($${Math.round(rentabilidad_cop_km).toLocaleString('es-CO')} COP/km)`;
      
    } else if (rentabilidad_cop_km >= conductor.umbral_amarillo_copkm) {
      // AMARILLO: Servicio regular
      semaforo = 'AMARILLO';
      porcentaje_vs_umbral = Math.round(
        (rentabilidad_cop_km / conductor.umbral_amarillo_copkm) * 100
      );
      mensaje = `Servicio regular ($${Math.round(rentabilidad_cop_km).toLocaleString('es-CO')} COP/km)`;
      
    } else {
      // ROJO: Poco rentable
      semaforo = 'ROJO';
      porcentaje_vs_umbral = Math.round(
        (rentabilidad_cop_km / conductor.umbral_amarillo_copkm) * 100
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
```

---

## 📋 Casos de Uso

### Caso 1: VERDE ✅
```
Conductor Luis:
  umbral_verde: $2.500 COP/km
  umbral_amarillo: $1.500 COP/km

Servicio:
  valor: $12.500
  km: 4.3

Cálculo:
  rentabilidad = 12.500 / 4.3 = 2.906 COP/km
  2.906 >= 2.500 → VERDE ✅
  porcentaje = (2.906 / 2.500) * 100 = 116%
  
Resultado:
{
  rentabilidad_cop_km: 2.906,
  semaforo: 'VERDE',
  porcentaje_vs_umbral: 116,
  mensaje: 'Excelente servicio ($2.906 COP/km)'
}
```

### Caso 2: AMARILLO 🟡
```
Mismo conductor Luis

Servicio:
  valor: $8.000
  km: 5

Cálculo:
  rentabilidad = 8.000 / 5 = 1.600 COP/km
  1.600 < 2.500 (no es verde)
  1.600 >= 1.500 (es amarillo) → AMARILLO 🟡
  porcentaje = (1.600 / 1.500) * 100 = 107%
  
Resultado:
{
  rentabilidad_cop_km: 1.600,
  semaforo: 'AMARILLO',
  porcentaje_vs_umbral: 107,
  mensaje: 'Servicio regular ($1.600 COP/km)'
}
```

### Caso 3: ROJO ❌
```
Mismo conductor Luis

Servicio:
  valor: $5.000
  km: 5

Cálculo:
  rentabilidad = 5.000 / 5 = 1.000 COP/km
  1.000 < 1.500 → ROJO ❌
  porcentaje = (1.000 / 1.500) * 100 = 67%
  
Resultado:
{
  rentabilidad_cop_km: 1.000,
  semaforo: 'ROJO',
  porcentaje_vs_umbral: 67,
  mensaje: 'Poco rentable ($1.000 COP/km)'
}
```

---

## 🚨 Casos Edge

### Caso 1: km_recorrido = 0
```
Input:
  valor: 1000
  km: 0
  umbrales: {...}

Resultado: ❌ THROW Error('km_recorrido debe ser mayor a 0')
```

### Caso 2: valor_cop Negativo
```
Input:
  valor: -500
  km: 2
  umbrales: {...}

Resultado: ❌ THROW Error('valor_cop no puede ser negativo')
```

### Caso 3: Rentabilidad Muy Alta
```
Input:
  valor: 50.000
  km: 1
  umbrales: verde=2500, amarillo=1500

Cálculo:
  rentabilidad = 50.000 / 1 = 50.000 COP/km
  50.000 >= 2.500 → VERDE ✅
  porcentaje = (50.000 / 2.500) * 100 = 2.000%
  
Resultado:
{
  rentabilidad_cop_km: 50000,
  semaforo: 'VERDE',
  porcentaje_vs_umbral: 2000,
  mensaje: 'Excelente servicio ($50.000 COP/km)'
}
```

### Caso 4: Rentabilidad Muy Baja
```
Input:
  valor: 100
  km: 100
  umbrales: verde=2500, amarillo=1500

Cálculo:
  rentabilidad = 100 / 100 = 1 COP/km
  1 < 1500 → ROJO ❌
  porcentaje = (1 / 1500) * 100 = 0%
  
Resultado:
{
  rentabilidad_cop_km: 1,
  semaforo: 'ROJO',
  porcentaje_vs_umbral: 0,
  mensaje: 'Poco rentable ($1 COP/km)'
}
```

---

## ✅ Validaciones Implementadas

| Validación | Input | Resultado |
|-----------|-------|-----------|
| `km_recorrido > 0` | km = 0 | ❌ Throw Error |
| `valor_cop >= 0` | valor = -500 | ❌ Throw Error |
| `umbral_verde > 0` | umbral = -100 | ❌ Throw Error |
| Cálculo correcto | 12500 / 4.3 | ✅ 2.906 (aproximado) |
| Semáforo correcto (VERDE) | 2906 >= 2500 | ✅ VERDE |
| Semáforo correcto (AMARILLO) | 1600 >= 1500 && 1600 < 2500 | ✅ AMARILLO |
| Semáforo correcto (ROJO) | 1000 < 1500 | ✅ ROJO |
| Porcentaje redondeado | 116.24% | ✅ 116 |
| Mensaje formateado | 2906.98 | ✅ "$2.907 COP/km" |

---

## 🎯 Detalles de Implementación

### Interfaz CalculoRentabilidad
```typescript
interface CalculoRentabilidad {
  rentabilidad_cop_km: number;      // Valor exacto (puede tener decimales)
  semaforo: 'VERDE' | 'AMARILLO' | 'ROJO';
  porcentaje_vs_umbral: number;     // Entero, redondeado
  mensaje: string;                  // Mensaje legible para usuario
}
```

### Método Estático
```typescript
static calcular(...)
// Por qué estático: No necesita instancia
// Se usa como: RentabilidadService.calcular(...)
// No: new RentabilidadService().calcular(...)
```

### Formato de Números
```typescript
// rentabilidad_cop_km: número exacto (puede tener decimales)
2.906

// porcentaje_vs_umbral: entero redondeado
116  // NO 116.24

// mensaje: formateado para usuario colombiano
'$2.906 COP/km'  // NO '2906 cop/km' ó '$ 2906'
```

---

## 📊 Checklist de Completación

- [ ] Creado archivo `src/services/rentabilidad.service.ts`
- [ ] Copiado código completo del archivo
- [ ] Interfaz `CalculoRentabilidad` definida
- [ ] Interfaz `UmbralesConductor` definida
- [ ] Método `calcular()` implementado
- [ ] Validación: km_recorrido > 0
- [ ] Validación: valor_cop >= 0
- [ ] Validación: umbrales > 0
- [ ] Cálculo de rentabilidad correcto
- [ ] Lógica de semáforo correcta (VERDE/AMARILLO/ROJO)
- [ ] Cálculo de porcentaje correcto
- [ ] Mensajes formateados
- [ ] Archivo compila sin errores: `npm run build`
- [ ] Commit: `git add src/services/rentabilidad.service.ts && git commit -m "feat(rentabilidad): create RentabilidadService"`

---

## 🚀 Testing

Tests para este servicio irán en:
```
src/services/__tests__/rentabilidad.service.test.ts
```

Pero eso es PASO 7 (Testing separado). Por ahora, solo crear el servicio.

---

## 🔗 Próximo Paso

Una vez completado ✅, pasa a **PASO 4: Controllers**

**Orden**:
1. ✅ PASO 1: Schema
2. ✅ PASO 2: Migración
3. ✅ PASO 3: RentabilidadService (estás aquí)
4. → PASO 4: Controllers
5. → PASO 5: Routes
6. → PASO 6: index.ts

