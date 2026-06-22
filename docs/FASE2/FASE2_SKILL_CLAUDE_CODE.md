# FASE 2: Custom Skill para Claude Code
## Plantilla para Cada Sesión

**Cómo usarlo**: Copia y pega la sección correspondiente en un nuevo chat de Claude Code

---

## 🎯 Cómo Usar Este Documento

1. **Abre Claude Code**: Nueva sesión
2. **Elige el PASO que vas a hacer** (1-6)
3. **Copia la sección `@backend-architect` correspondiente**
4. **Pega en el chat de Claude Code**
5. **Adjunta el archivo de especificación** (`docs/FASE2/PASO[N]_*.md`)
6. **Comienza la implementación**

---

## PASO 1: Schema Prisma

```
@backend-architect

FASE 2 - PASO 1: Schema Prisma

CONTEXTO:
- Estamos en FASE 2 de FareCheck
- Arquitectura: Opción B (Renombrar Viaje → Servicio)
- PASO 1 de 6: Actualizar schema Prisma

TAREA ESPECÍFICA:
Renombrar modelo Viaje a Servicio en prisma/schema.prisma

Cambios exactos:
1. Línea ~95: model Viaje → model Servicio
2. Línea ~158: @@map("viajes") → @@map("servicios")
3. Comentario: "VIAJES" → "SERVICIOS — ofertas de viaje evaluadas"

VALIDACIONES (después de cambios):
1. npx prisma validate → ✅ Sin errores
2. npx prisma generate → ✅ Client regenerado
3. grep "model Servicio" prisma/schema.prisma → ✅ Encontrado
4. grep '@@map("servicios")' prisma/schema.prisma → ✅ Encontrado

CRITERIOS DE ACEPTACIÓN:
✅ Archivo prisma/schema.prisma con model Servicio (no Viaje)
✅ @@map("servicios") actualizado
✅ npx prisma validate sin errores
✅ npx prisma generate funciona
✅ Commit limpio: git add prisma/schema.prisma

NO HAGAS:
- Cambiar nombres de campos
- Agregar campos nuevos
- Tocar otros models
- Migraciones (eso es PASO 2)

ARCHIVOS DE REFERENCIA:
- Especificación: docs/FASE2/PASO1_SCHEMA.md
- Schema actual: prisma/schema.prisma
- Modelo antes: busca "model Viaje" en el schema
```

---

## PASO 2: Migración Base de Datos

```
@backend-architect

FASE 2 - PASO 2: Migración Base de Datos

CONTEXTO:
- Estamos en FASE 2 de FareCheck
- PASO 1 ✅ completado (Schema actualizado)
- PASO 2 de 6: Migrar BD de "viajes" a "servicios"

TAREA ESPECÍFICA:
Ejecutar migración Prisma para renombrar tabla

Pasos exactos:
1. cd farecheck-api
2. npx prisma migrate dev --name rename_viaje_to_servicio
3. Selecciona: "Yes, create migration"
4. Espera a que termine
5. Valida con: npx prisma studio

VALIDACIONES:
1. Migración creada: ls prisma/migrations/ | tail -2
2. Archivo SQL correcto: cat prisma/migrations/.../migration.sql
3. BD actualizada: npx prisma studio → tabla "servicios" visible
4. Datos preservados: SELECT COUNT(*) FROM servicios;
5. Client regenerado: npx prisma generate ✅

CRITERIOS DE ACEPTACIÓN:
✅ Migración archivo creada en prisma/migrations/
✅ Comando "ALTER TABLE ... RENAME" en migration.sql
✅ npx prisma studio muestra tabla "servicios"
✅ Tabla no se llama más "viajes"
✅ Datos preservados (si los hay)
✅ Commit: git add prisma/migrations

ERRORES COMUNES:
- "Database connection failed" → Verificar PostgreSQL corre
- "Cannot find migration" → Verificar PASO 1 completado
- "Table 'viajes' not found" → Migraciones previas fallaron

ARCHIVOS DE REFERENCIA:
- Especificación: docs/FASE2/PASO2_MIGRACION.md
- Migraciones: prisma/migrations/
```

---

## PASO 3: RentabilidadService

```
@backend-architect

FASE 2 - PASO 3: RentabilidadService

CONTEXTO:
- Estamos en FASE 2 de FareCheck
- PASO 1 ✅ Schema actualizado
- PASO 2 ✅ Migración ejecutada (o en paralelo)
- PASO 3 de 6: Crear servicio de cálculo de rentabilidad

TAREA ESPECÍFICA:
Crear nuevo archivo: src/services/rentabilidad.service.ts

Funcionalidad:
- Input: valor_cop (número), km_recorrido (número), conductor_umbrales (objeto)
- Calcula: rentabilidad = valor_cop / km_recorrido
- Compara: rentabilidad vs umbrales del conductor
- Output: {rentabilidad_cop_km, semaforo, porcentaje_vs_umbral, mensaje}

Lógica de semáforo:
- VERDE: rentabilidad >= umbral_verde
- AMARILLO: umbral_amarillo <= rentabilidad < umbral_verde
- ROJO: rentabilidad < umbral_amarillo

VALIDACIONES:
1. npm run build → ✅ Sin errores TypeScript
2. Clase exportada: import { RentabilidadService }
3. Método estático: RentabilidadService.calcular(...)
4. Tests locales en terminal (manual):
   - Caso VERDE: valor=12500, km=4.3, umbrales={verde:1500, amarillo:900}
   - Caso AMARILLO: valor=5000, km=5
   - Caso ROJO: valor=3000, km=5
   - Edge: km=0 → debe throw Error

CRITERIOS DE ACEPTACIÓN:
✅ Archivo src/services/rentabilidad.service.ts creado
✅ Interfaz CalculoRentabilidad definida
✅ Método calcular() implementado
✅ Validaciones: km > 0, valor >= 0, umbrales > 0
✅ Cálculo de rentabilidad correcto (división)
✅ Semáforo determina correctamente (VERDE/AMARILLO/ROJO)
✅ Porcentaje redondeado a entero
✅ Mensaje formateado legible
✅ npm run build sin errores
✅ Commit: git add src/services/rentabilidad.service.ts

NO HAGAS:
- Tests todavía (PASO 7)
- Cambiar BD (ya está hecho)
- Llamar desde controllers (PASO 4)

ARCHIVOS DE REFERENCIA:
- Especificación: docs/FASE2/PASO3_RENTABILIDAD.md
- Casos de uso: docs/FASE2/PASO3_RENTABILIDAD.md
- Fórmulas: docs/FASE2/PASO3_RENTABILIDAD.md

EJEMPLOS:
RentabilidadService.calcular(12500, 4.3, {umbral_verde_copkm: 1500, umbral_amarillo_copkm: 900})
→ {rentabilidad_cop_km: 2906, semaforo: 'VERDE', porcentaje_vs_umbral: 194, mensaje: '...'}
```

---

## PASO 4: Controllers

```
@backend-architect

FASE 2 - PASO 4: Controllers (Largo - Varios controllers)

CONTEXTO:
- Estamos en FASE 2 de FareCheck
- PASOS 1-3 ✅ completados
- PASO 4 de 6: Crear/renombrar controllers

TAREA ESPECÍFICA:
1. Renombrar: src/controllers/viajes.controller.ts → src/controllers/servicios.controller.ts
2. Actualizar código interno:
   - prisma.viaje → prisma.servicio
   - Tipos: Viaje → Servicio
   - Nombres funciones: getViaje → obtenerServicio, getHistorial → listarServicios
3. AGREGAR funciones nuevas:
   - crearServicio() — POST crear servicio
   - actualizarDecision() — PATCH actualizar decisión

FUNCIONES ESPERADAS:
1. listarServicios(req, res) — GET /api/v1/servicios?page=1&limit=10&estado=todos
   - Parámetros: page, limit (max 50), estado (todos|aceptados|rechazados)
   - Include: plataforma, turno
   - Paginar y retornar lista

2. obtenerServicio(req, res) — GET /api/v1/servicios/:id
   - Validar que pertenece al conductor
   - Include: plataforma, turno
   - Retornar detalles

3. crearServicio(req, res) — POST /api/v1/servicios (NUEVA)
   - Body: plataforma_id, turno_id, valor_cop, km_recorrido, km_recogida?, tiempo_*?, etc.
   - Validar datos con Zod
   - Validar turno pertenece conductor
   - Validar plataforma existe
   - Usar RentabilidadService.calcular()
   - Crear en BD
   - Retornar servicio + análisis

4. actualizarDecision(req, res) — PATCH /api/v1/servicios/:id/decision (NUEVA)
   - Body: {aceptado: boolean}
   - Validar que pertenece conductor
   - Actualizar campo aceptado
   - Retornar servicio actualizado

VALIDACIONES:
1. npm run build → ✅ Sin errores
2. Archivo renombrado: ls src/controllers/ | grep servicios
3. Funciones exportadas: export function listarServicios, obtenerServicio, etc.
4. Schemas Zod: definidos y correctos
5. Imports actualizados: RentabilidadService importado
6. Prisma queries: prisma.servicio (no viajes)

CRITERIOS DE ACEPTACIÓN:
✅ Archivo renombrado a servicios.controller.ts
✅ 4 funciones implementadas (listar, obtener, crear, decision)
✅ Schemas Zod para validación
✅ Manejo de errores correcto
✅ Include relaciones (plataforma, turno)
✅ RentabilidadService integrado en crearServicio
✅ npm run build sin errores
✅ Commit: git add src/controllers/servicios.controller.ts && git rm src/controllers/viajes.controller.ts

NO HAGAS:
- Cambiar rutas (PASO 5)
- Tests todavía (PASO 7)

ARCHIVOS DE REFERENCIA:
- Especificación: docs/FASE2/PASO4_CONTROLLERS.md (será creado)
- Schema anterior: src/controllers/viajes.controller.ts (actual)
- RentabilidadService: src/services/rentabilidad.service.ts
```

---

## PASO 5: Routes

```
@backend-architect

FASE 2 - PASO 5: Routes

CONTEXTO:
- Estamos en FASE 2 de FareCheck
- PASOS 1-4 ✅ completados
- PASO 5 de 6: Crear/renombrar routes

TAREA ESPECÍFICA:
1. Renombrar: src/routes/viajes.routes.ts → src/routes/servicios.routes.ts
2. Actualizar imports: de viajes.controller → servicios.controller
3. Mapear endpoints:
   - GET / → listarServicios()
   - GET /:id → obtenerServicio()
   - POST / → crearServicio()
   - PATCH /:id/decision → actualizarDecision()

ENDPOINTS EXACTOS:
GET    /api/v1/servicios                      → listarServicios
GET    /api/v1/servicios/:id                  → obtenerServicio
POST   /api/v1/servicios                      → crearServicio
PATCH  /api/v1/servicios/:id/decision         → actualizarDecision

VALIDACIONES:
1. Archivo renombrado: ls src/routes/ | grep servicios
2. Imports correctos
3. Router mapeado correctamente
4. npm run build sin errores

CRITERIOS DE ACEPTACIÓN:
✅ Archivo renombrado a servicios.routes.ts
✅ Imports actualizados
✅ 4 endpoints mapeados
✅ Métodos HTTP correctos (GET, POST, PATCH)
✅ Paths correctos
✅ npm run build sin errores
✅ Commit: git add src/routes/servicios.routes.ts && git rm src/routes/viajes.routes.ts

ARCHIVOS DE REFERENCIA:
- Especificación: docs/FASE2/PASO5_ROUTES.md (será creado)
- Routes anterior: src/routes/viajes.routes.ts (actual)
```

---

## PASO 6: index.ts

```
@backend-architect

FASE 2 - PASO 6: index.ts

CONTEXTO:
- Estamos en FASE 2 de FareCheck
- PASOS 1-5 ✅ completados
- PASO 6 de 6: Actualizar index.ts

TAREA ESPECÍFICA:
Cambiar 2 líneas en src/index.ts:
1. Import: viajesRoutes → serviciosRoutes
2. App.use: /api/v1/viajes → /api/v1/servicios

CAMBIOS EXACTOS:

# LÍNEA 1 (imports, ~20-30):
# ANTES:
import viajesRoutes from './routes/viajes.routes';

# DESPUÉS:
import serviciosRoutes from './routes/servicios.routes';

# LÍNEA 2 (app.use, ~100-110):
# ANTES:
app.use('/api/v1/viajes', viajesRoutes);

# DESPUÉS:
app.use('/api/v1/servicios', serviciosRoutes);

VALIDACIONES:
1. npm run build → ✅ Sin errores
2. npm run dev → ✅ App inicia correctamente
3. Buscar "viajes" en index.ts → ❌ No encontrado (excepto comentarios/strings)
4. Buscar "servicios" → ✅ Encontrado 2 veces (import + app.use)

CRITERIOS DE ACEPTACIÓN:
✅ Import actualizado
✅ app.use() actualizado
✅ npm run build sin errores
✅ npm run dev inicia sin errores
✅ No hay referencias a viajesRoutes en index.ts
✅ Commit: git add src/index.ts

ARCHIVOS DE REFERENCIA:
- Especificación: docs/FASE2/PASO6_INDEX.md (será creado)
- Archivo: src/index.ts (buscar líneas ~20-30 y ~100-110)
```

---

## PASO 7: Tests

```
@backend-architect

FASE 2 - PASO 7: Tests (RentabilidadService)

CONTEXTO:
- Estamos en FASE 2 de FareCheck
- PASOS 1-6 ✅ completados
- PASO 7: Tests unitarios de RentabilidadService

TAREA ESPECÍFICA:
Crear archivo: src/services/__tests__/rentabilidad.service.test.ts

Tests esperados:
1. VERDE: rentabilidad >= umbral_verde
2. AMARILLO: entre umbrales
3. ROJO: < umbral_amarillo
4. Error: km = 0
5. Error: valor < 0
6. Porcentaje calculado correctamente

VALIDACIONES:
1. npm run test rentabilidad.service.test.ts → ✅ Todos pasan
2. Cobertura: 100% de la clase

CRITERIOS DE ACEPTACIÓN:
✅ Archivo tests creado
✅ 6+ tests implementados
✅ Todos los tests pasan (npm run test)
✅ Commit: git add src/services/__tests__/rentabilidad.service.test.ts

ARCHIVOS DE REFERENCIA:
- Especificación: docs/FASE2/TESTING.md
- Servicio: src/services/rentabilidad.service.ts
```

---

## 🎯 Resumen Rápido de Pasos

```
PASO 1 (15 min)  → Schema: model Viaje → model Servicio
PASO 2 (10 min)  → Migración: npx prisma migrate dev
PASO 3 (30 min)  → RentabilidadService: crear servicio
PASO 4 (45 min)  → Controllers: renombrar + 2 funciones nuevas
PASO 5 (20 min)  → Routes: renombrar + mapeos
PASO 6 (10 min)  → index.ts: 2 líneas
PASO 7 (30 min)  → Tests: unittest
─────────────────────────────────────
TOTAL: ~160 min (~2.5 horas)
```

---

## 📋 Orden de Ejecución

```
Sesión 1: PASO 1 + 2 (Schema + Migración)
Sesión 2: PASO 3 (RentabilidadService)
Sesión 3: PASO 4 (Controllers - Largo)
Sesión 4: PASO 5 + 6 (Routes + index)
Sesión 5: PASO 7 (Tests) + Validación Manual + Deploy
```

---

## 📚 Archivos Finales

Después de completar FASE 2, los archivos serán:

```
✅ prisma/schema.prisma           (renombrado Viaje → Servicio)
✅ prisma/migrations/.../...      (migración nueva)
✅ src/services/rentabilidad.service.ts
✅ src/controllers/servicios.controller.ts
✅ src/routes/servicios.routes.ts
✅ src/index.ts                   (imports actualizados)
✅ src/services/__tests__/rentabilidad.service.test.ts
❌ src/controllers/viajes.controller.ts (eliminado)
❌ src/routes/viajes.routes.ts (eliminado)
```

---

## 🚀 Pasos Finales Después de Todo

```
1. npm run build               → Verifica compilación
2. npm run test               → Corre todos los tests
3. npm run dev                → Inicia app local
4. Prueba manual endpoints:
   - POST /api/v1/servicios   (crear)
   - GET /api/v1/servicios    (listar)
   - GET /api/v1/servicios/:id (obtener)
5. git commit -m "feat(fase2): implement service rentability model"
6. git push                   → Deploy a Railway
```

