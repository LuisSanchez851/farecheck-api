# FASE 2: Plan Detallado de Migración Viaje → Servicio

**Opción B** - Renombrar tabla `Viaje` a `Servicio`

---

## 📋 Estado Actual (Diagnóstico)

### Schema Prisma
- ✅ Tabla `Viaje` existe con campos correctos:
  - `valor_cop`, `km_recogida`, `km_recorrido`, `tiempo_*`
  - `valor_copkm` (rentabilidad calculada)
  - `semaforo` enum (VERDE, AMARILLO, ROJO)
  - `aceptado` boolean (decisión)
  - Relaciones: `Turno`, `Plataforma`

### Backend Controllers/Routes
- ✅ `viajes.controller.ts`: `getHistorial()`, `getViaje()`
- ✅ `viajes.routes.ts`: GET /, GET /:id
- ❌ **FALTA**: POST crear servicio
- ❌ **FALTA**: PATCH actualizar decisión
- ❌ **FALTA**: RentabilidadService (lógica de cálculo)
- ❌ **FALTA**: Tests

---

## 🔄 Plan de 6 Pasos

### PASO 1: Actualizar Schema Prisma

**Archivo**: `prisma/schema.prisma`

**Cambios**:
```prisma
# ANTES:
model Viaje {
  ...
  @@map("viajes")
}

# DESPUÉS:
model Servicio {
  ...
  @@map("servicios")  // Tabla en BD se llama "servicios"
}
```

**Detalles**:
- Renombrar `model Viaje` → `model Servicio`
- Cambiar `@@map("viajes")` → `@@map("servicios")`
- Los campos permanecen IGUAL
- Actualizar comentarios interiores
- Dejar enums Semaforo y EstadoTurno igual

**Archivo completo esperado**: 
```prisma
model Servicio {
  id            String     @id @default(uuid())
  turno_id      String
  turno         Turno      @relation(fields: [turno_id], references: [id])
  plataforma_id String
  plataforma    Plataforma @relation(fields: [plataforma_id], references: [id])

  registrado_en DateTime   @default(now())

  valor_cop           Float
  km_recogida         Float
  km_recorrido        Float
  tiempo_recogida_min Int
  tiempo_total_min    Int

  calificacion_pasajero Float?
  viajes_pasajero       Int?

  km_total             Float
  valor_copkm          Float
  semaforo             Semaforo
  porcentaje_vs_umbral Int

  aceptado Boolean?

  @@map("servicios")
}

enum Semaforo {
  VERDE
  AMARILLO
  ROJO
}
```

---

### PASO 2: Migración de Base de Datos

**Comando**:
```bash
cd farecheck-api
npx prisma migrate dev --name rename_viaje_to_servicio
```

**Qué ocurre**:
1. Prisma detecta el cambio de nombre
2. Crea migración: `prisma/migrations/TIMESTAMP_rename_viaje_to_servicio/migration.sql`
3. Ejecuta migración en BD (local)
4. Regenera cliente Prisma

**Validación post-migración**:
```bash
npx prisma studio  # Verifica que la tabla "servicios" existe con datos
```

---

### PASO 3: Crear RentabilidadService

**Archivo**: `src/services/rentabilidad.service.ts` (NUEVO)

```typescript
import { Prisma } from '@prisma/client';

interface CalculoRentabilidad {
  rentabilidad_cop_km: number;
  semaforo: 'VERDE' | 'AMARILLO' | 'ROJO';
  porcentaje_vs_umbral: number;
  mensaje: string;
}

export class RentabilidadService {
  /**
   * Calcula rentabilidad de un servicio basado en umbrales del conductor
   */
  static calcular(
    valor_cop: number,
    km_recorrido: number,
    conductor: {
      umbral_verde_copkm: number;
      umbral_amarillo_copkm: number;
    }
  ): CalculoRentabilidad {
    // Validaciones
    if (km_recorrido <= 0) {
      throw new Error('km_recorrido debe ser mayor a 0');
    }
    if (valor_cop < 0) {
      throw new Error('valor_cop no puede ser negativo');
    }

    // Cálculo de rentabilidad
    const rentabilidad_cop_km = valor_cop / km_recorrido;

    // Determinar semáforo
    let semaforo: 'VERDE' | 'AMARILLO' | 'ROJO';
    let porcentaje_vs_umbral: number;
    let mensaje: string;

    if (rentabilidad_cop_km >= conductor.umbral_verde_copkm) {
      semaforo = 'VERDE';
      porcentaje_vs_umbral = Math.round(
        (rentabilidad_cop_km / conductor.umbral_verde_copkm) * 100
      );
      mensaje = `Excelente servicio ($${rentabilidad_cop_km.toFixed(0)} COP/km)`;
    } else if (rentabilidad_cop_km >= conductor.umbral_amarillo_copkm) {
      semaforo = 'AMARILLO';
      porcentaje_vs_umbral = Math.round(
        (rentabilidad_cop_km / conductor.umbral_amarillo_copkm) * 100
      );
      mensaje = `Servicio regular ($${rentabilidad_cop_km.toFixed(0)} COP/km)`;
    } else {
      semaforo = 'ROJO';
      porcentaje_vs_umbral = Math.round(
        (rentabilidad_cop_km / (conductor.umbral_amarillo_copkm || 1)) * 100
      );
      mensaje = `Poco rentable ($${rentabilidad_cop_km.toFixed(0)} COP/km)`;
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

### PASO 4: Actualizar Controllers

**Archivo**: `src/controllers/viajes.controller.ts` → `src/controllers/servicios.controller.ts`

**Cambios**:
1. Renombrar archivo
2. Actualizar imports: `prisma.viaje` → `prisma.servicio`
3. Actualizar tipos: `Viaje` → `Servicio`
4. Actualizar nombres de funciones: `getViaje()` → `getServicio()`
5. **AGREGAR**: `crearServicio()` - POST
6. **AGREGAR**: `actualizarDecision()` - PATCH

**Archivo completo**:
```typescript
import { Request, Response } from 'express';
import { z } from 'zod';
import { Prisma } from '@prisma/client';
import { prisma } from '../prisma/client';
import { logger } from '../utils/logger';
import { API_ERRORS } from '../types/api.types';
import { RentabilidadService } from '../services/rentabilidad.service';

// ── SCHEMAS DE VALIDACIÓN ──

const listaQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(10),
  estado: z.enum(['todos', 'aceptados', 'rechazados']).default('todos'),
});

const idParamSchema = z.object({
  id: z.string().uuid('El identificador no es válido.'),
});

const crearServicioSchema = z.object({
  plataforma_id: z.string().uuid('plataforma_id debe ser UUID válido'),
  turno_id: z.string().uuid('turno_id debe ser UUID válido'),
  valor_cop: z.number().min(0, 'valor_cop no puede ser negativo'),
  km_recogida: z.number().min(0).optional(),
  km_recorrido: z.number().min(0.1, 'km_recorrido debe ser > 0'),
  tiempo_recogida_min: z.number().int().min(0).optional(),
  tiempo_total_min: z.number().int().min(0).optional(),
  calificacion_pasajero: z.number().min(0).max(5).optional(),
  viajes_pasajero: z.number().int().min(0).optional(),
});

const actualizarDecisionSchema = z.object({
  aceptado: z.boolean(),
});

// ── CONTROLADORES ──

/**
 * GET /api/v1/servicios?page=1&limit=10&estado=todos
 * Historial paginado de servicios (ofertas evaluadas) del conductor
 */
export async function listarServicios(req: Request, res: Response): Promise<void> {
  try {
    const { page, limit, estado } = listaQuerySchema.parse(req.query);

    const where: Prisma.ServicioWhereInput = {
      turno: { conductor_id: req.conductor_id },
      ...(estado === 'aceptados'
        ? { aceptado: true }
        : estado === 'rechazados'
          ? { aceptado: false }
          : {}),
    };

    const [servicios, total] = await Promise.all([
      prisma.servicio.findMany({
        where,
        orderBy: { registrado_en: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          plataforma: { select: { id: true, nombre: true, icono_url: true } },
          turno: { select: { id: true, estado: true } },
        },
      }),
      prisma.servicio.count({ where }),
    ]);

    res.json({
      servicios,
      page,
      limit,
      total,
      has_more: page * limit < total,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({
        error: API_ERRORS.VALIDACION_FALLIDA,
        message: error.errors[0]?.message,
      });
      return;
    }
    logger.error('Error en listarServicios:', { error });
    res.status(500).json({
      error: 'error_interno',
      message: 'No se pudo obtener el historial de servicios.',
    });
  }
}

/**
 * GET /api/v1/servicios/:id
 * Detalle de un servicio específico
 */
export async function obtenerServicio(req: Request, res: Response): Promise<void> {
  try {
    const { id } = idParamSchema.parse(req.params);

    const servicio = await prisma.servicio.findFirst({
      where: { id, turno: { conductor_id: req.conductor_id } },
      include: {
        plataforma: { select: { id: true, nombre: true, icono_url: true } },
        turno: { select: { id: true, estado: true } },
      },
    });

    if (!servicio) {
      res.status(404).json({
        error: 'servicio_no_encontrado',
        message: 'Servicio no encontrado.',
      });
      return;
    }

    res.json(servicio);
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({
        error: API_ERRORS.VALIDACION_FALLIDA,
        message: error.errors[0]?.message,
      });
      return;
    }
    logger.error('Error en obtenerServicio:', { error });
    res.status(500).json({
      error: 'error_interno',
      message: 'No se pudo obtener el servicio.',
    });
  }
}

/**
 * POST /api/v1/servicios
 * Crear un nuevo servicio y calcular su rentabilidad
 */
export async function crearServicio(req: Request, res: Response): Promise<void> {
  try {
    const datos = crearServicioSchema.parse(req.body);

    // Obtener conductor con sus umbrales
    const conductor = await prisma.conductor.findUnique({
      where: { id: req.conductor_id },
      select: {
        id: true,
        umbral_verde_copkm: true,
        umbral_amarillo_copkm: true,
      },
    });

    if (!conductor) {
      res.status(404).json({
        error: 'conductor_no_encontrado',
        message: 'Conductor no existe.',
      });
      return;
    }

    // Validar que el turno pertenece al conductor
    const turno = await prisma.turno.findFirst({
      where: { id: datos.turno_id, conductor_id: req.conductor_id },
    });

    if (!turno) {
      res.status(404).json({
        error: 'turno_no_encontrado',
        message: 'Turno no existe o no pertenece al conductor.',
      });
      return;
    }

    // Validar que la plataforma existe
    const plataforma = await prisma.plataforma.findUnique({
      where: { id: datos.plataforma_id },
    });

    if (!plataforma) {
      res.status(404).json({
        error: 'plataforma_no_encontrada',
        message: 'Plataforma no existe.',
      });
      return;
    }

    // Calcular rentabilidad
    const calculo = RentabilidadService.calcular(
      datos.valor_cop,
      datos.km_recorrido,
      {
        umbral_verde_copkm: conductor.umbral_verde_copkm,
        umbral_amarillo_copkm: conductor.umbral_amarillo_copkm,
      }
    );

    // Crear servicio
    const servicio = await prisma.servicio.create({
      data: {
        turno_id: datos.turno_id,
        plataforma_id: datos.plataforma_id,
        valor_cop: datos.valor_cop,
        km_recogida: datos.km_recogida ?? 0,
        km_recorrido: datos.km_recorrido,
        tiempo_recogida_min: datos.tiempo_recogida_min ?? 0,
        tiempo_total_min: datos.tiempo_total_min ?? 0,
        calificacion_pasajero: datos.calificacion_pasajero ?? null,
        viajes_pasajero: datos.viajes_pasajero ?? null,
        km_total: datos.km_recogida ? datos.km_recogida + datos.km_recorrido : datos.km_recorrido,
        valor_copkm: calculo.rentabilidad_cop_km,
        semaforo: calculo.semaforo,
        porcentaje_vs_umbral: calculo.porcentaje_vs_umbral,
        aceptado: null, // Sin decisión inicial
      },
      include: {
        plataforma: { select: { id: true, nombre: true, icono_url: true } },
        turno: { select: { id: true, estado: true } },
      },
    });

    res.status(201).json({
      servicio,
      analisis: {
        rentabilidad_cop_km: calculo.rentabilidad_cop_km,
        semaforo: calculo.semaforo,
        porcentaje_vs_umbral: calculo.porcentaje_vs_umbral,
        mensaje: calculo.mensaje,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({
        error: API_ERRORS.VALIDACION_FALLIDA,
        message: error.errors[0]?.message,
        details: error.errors,
      });
      return;
    }
    logger.error('Error en crearServicio:', { error });
    res.status(500).json({
      error: 'error_creando_servicio',
      message: error instanceof Error ? error.message : 'Error desconocido',
    });
  }
}

/**
 * PATCH /api/v1/servicios/:id/decision
 * Registrar decisión del conductor (aceptado/rechazado)
 */
export async function actualizarDecision(
  req: Request,
  res: Response
): Promise<void> {
  try {
    const { id } = idParamSchema.parse(req.params);
    const { aceptado } = actualizarDecisionSchema.parse(req.body);

    // Validar que pertenece al conductor
    const servicioActual = await prisma.servicio.findFirst({
      where: { id, turno: { conductor_id: req.conductor_id } },
    });

    if (!servicioActual) {
      res.status(404).json({
        error: 'servicio_no_encontrado',
        message: 'Servicio no encontrado.',
      });
      return;
    }

    // Actualizar decisión
    const servicioActualizado = await prisma.servicio.update({
      where: { id },
      data: { aceptado },
      include: {
        plataforma: { select: { id: true, nombre: true, icono_url: true } },
        turno: { select: { id: true, estado: true } },
      },
    });

    res.json(servicioActualizado);
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({
        error: API_ERRORS.VALIDACION_FALLIDA,
        message: error.errors[0]?.message,
      });
      return;
    }
    logger.error('Error en actualizarDecision:', { error });
    res.status(500).json({
      error: 'error_actualizando_decision',
      message: 'No se pudo actualizar la decisión.',
    });
  }
}
```

---

### PASO 5: Actualizar Routes

**Archivo**: `src/routes/viajes.routes.ts` → `src/routes/servicios.routes.ts`

```typescript
import { Router } from 'express';
import {
  listarServicios,
  obtenerServicio,
  crearServicio,
  actualizarDecision,
} from '../controllers/servicios.controller';

const router = Router();

// GET /api/v1/servicios?page=1&limit=10&estado=todos
router.get('/', listarServicios);

// GET /api/v1/servicios/:id
router.get('/:id', obtenerServicio);

// POST /api/v1/servicios
router.post('/', crearServicio);

// PATCH /api/v1/servicios/:id/decision
router.patch('/:id/decision', actualizarDecision);

export default router;
```

---

### PASO 6: Actualizar index.ts

**Archivo**: `src/index.ts`

**Cambios** (2 líneas):
```typescript
// ANTES:
import viajesRoutes from './routes/viajes.routes';
...
app.use('/api/v1/viajes', viajesRoutes);

// DESPUÉS:
import serviciosRoutes from './routes/servicios.routes';
...
app.use('/api/v1/servicios', serviciosRoutes);
```

---

## 🧪 Tests

**Archivo**: `src/services/__tests__/rentabilidad.service.test.ts` (NUEVO)

```typescript
import { RentabilidadService } from '../rentabilidad.service';

describe('RentabilidadService', () => {
  const conductor = {
    umbral_verde_copkm: 1500,
    umbral_amarillo_copkm: 900,
  };

  describe('calcular()', () => {
    it('retorna VERDE cuando rentabilidad >= umbral_verde', () => {
      const resultado = RentabilidadService.calcular(12500, 4.3, conductor);
      expect(resultado.semaforo).toBe('VERDE');
      expect(resultado.rentabilidad_cop_km).toBeCloseTo(2906, 0);
    });

    it('retorna AMARILLO cuando está entre amarillo y verde', () => {
      const resultado = RentabilidadService.calcular(5000, 5, conductor);
      expect(resultado.semaforo).toBe('AMARILLO');
      expect(resultado.rentabilidad_cop_km).toBe(1000);
    });

    it('retorna ROJO cuando rentabilidad < umbral_amarillo', () => {
      const resultado = RentabilidadService.calcular(3000, 5, conductor);
      expect(resultado.semaforo).toBe('ROJO');
      expect(resultado.rentabilidad_cop_km).toBe(600);
    });

    it('lanza error si km_recorrido <= 0', () => {
      expect(() => RentabilidadService.calcular(12500, 0, conductor)).toThrow();
    });

    it('calcula porcentaje_vs_umbral correctamente (VERDE)', () => {
      const resultado = RentabilidadService.calcular(12500, 4.3, conductor);
      // 2906 / 1500 = 1.937 ≈ 194%
      expect(resultado.porcentaje_vs_umbral).toBe(194);
    });

    it('calcula porcentaje_vs_umbral correctamente (AMARILLO)', () => {
      const resultado = RentabilidadService.calcular(5000, 5, conductor);
      // 1000 / 900 = 1.111 ≈ 111%
      expect(resultado.porcentaje_vs_umbral).toBe(111);
    });
  });
});
```

**Comando para ejecutar**:
```bash
npm run test -- rentabilidad.service.test.ts
```

---

## ✅ Checklist de Implementación

### Paso 1: Schema
- [ ] Renombrar `model Viaje` → `model Servicio`
- [ ] Cambiar `@@map("viajes")` → `@@map("servicios")`
- [ ] Validar schema sintaxis con `npx prisma validate`

### Paso 2: Migración
- [ ] Ejecutar `npx prisma migrate dev --name rename_viaje_to_servicio`
- [ ] Verificar migración creada en `prisma/migrations/`
- [ ] Verificar tabla "servicios" existe en BD con `npx prisma studio`

### Paso 3: RentabilidadService
- [ ] Crear `src/services/rentabilidad.service.ts`
- [ ] Implementar método `calcular()`
- [ ] Validaciones de entrada

### Paso 4: Controllers
- [ ] Renombrar `viajes.controller.ts` → `servicios.controller.ts`
- [ ] Actualizar imports: `prisma.viaje` → `prisma.servicio`
- [ ] Implementar `listarServicios()`
- [ ] Implementar `obtenerServicio()`
- [ ] Implementar `crearServicio()` con RentabilidadService
- [ ] Implementar `actualizarDecision()`
- [ ] Schemas Zod correctos

### Paso 5: Routes
- [ ] Renombrar `viajes.routes.ts` → `servicios.routes.ts`
- [ ] Actualizar imports
- [ ] Mapear GET / → `listarServicios()`
- [ ] Mapear GET /:id → `obtenerServicio()`
- [ ] Mapear POST / → `crearServicio()`
- [ ] Mapear PATCH /:id/decision → `actualizarDecision()`

### Paso 6: Index.ts
- [ ] Actualizar import: `viajesRoutes` → `serviciosRoutes`
- [ ] Actualizar middleware: `/api/v1/viajes` → `/api/v1/servicios`

### Tests
- [ ] Crear `src/services/__tests__/rentabilidad.service.test.ts`
- [ ] Tests para VERDE, AMARILLO, ROJO
- [ ] Tests validación (km > 0, etc.)
- [ ] Ejecutar: `npm run test`
- [ ] Verificar cobertura

### Validación Manual
- [ ] `npm run build` sin errores
- [ ] `npm run dev` inicia correctamente
- [ ] POST /api/v1/servicios con datos válidos → crea servicio
- [ ] GET /api/v1/servicios → lista servicios
- [ ] GET /api/v1/servicios/:id → obtiene detalles
- [ ] PATCH /api/v1/servicios/:id/decision → actualiza decisión
- [ ] Semáforo calcula correctamente (VERDE/AMARILLO/ROJO)

### Deploy
- [ ] Commits limpios y pusheados
- [ ] Railway re-deploy automático
- [ ] Verificar endpoints en Railway

---

## 📝 Notas Importantes

1. **Breaking change en BD**: La tabla "viajes" pasa a llamarse "servicios"
   - Si hay datos en "viajes", la migración los preservará automáticamente
   - La migración crea la tabla "servicios" con los datos migrados

2. **Breaking change en APIs**: 
   - `/api/v1/viajes` → `/api/v1/servicios`
   - Frontend debe actualizar todas las llamadas

3. **Términos semánticos post-migración**:
   - `Servicio` = Oferta que el conductor ve (pre-decisión)
   - Campo `aceptado` = Si aceptó o rechazó la oferta
   - No confundir con "Viaje" (viaje completado) — eso viene en fases posteriores

4. **Campos que cambian nombre**:
   - Ninguno. El schema de `Servicio` es idéntico al de `Viaje`
   - Solo la tabla y modelo Prisma cambian nombre

---

## 🚀 Orden Recomendado de Ejecución

1. **Local development**:
   - Paso 1 (Schema)
   - Paso 2 (Migración BD local)
   - Paso 3 (RentabilidadService)
   - Paso 4 (Controllers)
   - Paso 5 (Routes)
   - Paso 6 (index.ts)
   - Tests
   - `npm run build` y `npm run dev` local

2. **Push a GitHub**:
   - Commits limpios
   - PR si tienes review

3. **Deploy a Railway**:
   - Railway ejecuta migraciones automáticamente
   - Verifica `/health` endpoint
   - Manual test endpoints

---

## 📚 Documentación Actualizar

Después de implementar:
- [ ] README.md: actualizar rutas `/servicios`
- [ ] SPRINTS.md: marcar FASE 2 como "En Progreso"
- [ ] ARCHITECTURE.md: actualizar diagrama de tablas
- [ ] Crear `docs/RENTABILIDAD.md` con:
  - Flujo de cálculo
  - Fórmula de semáforo
  - Umbrales personalizables
  - Ejemplos

