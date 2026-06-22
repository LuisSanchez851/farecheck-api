# FASE 2 CHECKPOINT
## Estado Actual - Antes de Implementación

**Fecha**: Junio 21, 2026  
**Status**: 📋 Fase de Documentación (Phase 0) COMPLETADA  
**Siguiente**: Implementación con Claude Code  

---

## 🎯 Qué es Este Documento

Registro detallado del estado actual para que cualquier sesión de Claude Code sepa:
- Dónde estamos
- Qué ya existe
- Qué falta
- Decisiones tomadas
- Dependencias

---

## ✅ Lo Que YA EXISTE

### Base de Datos (Prisma Schema)

**Tabla CONDUCTOR**
```prisma
model Conductor {
  id: String @id @default(uuid())
  firebase_uid: String @unique
  nombre: String
  email: String?
  telefono: String?
  
  // ✅ UMBRALES YA EXISTEN
  umbral_verde_copkm: Float @default(1500)
  umbral_amarillo_copkm: Float @default(900)
  
  // Relaciones
  turnos: Turno[]
  suscripciones: Suscripcion[]
  contactos_emergencia: ContactoEmergencia[]
}
```
**Status**: ✅ Existe, umbrales ya en schema

**Tabla TURNO**
```prisma
model Turno {
  id: String @id @default(uuid())
  conductor_id: String
  conductor: Conductor @relation(...)
  
  inicio: DateTime
  fin: DateTime?
  estado: EstadoTurno @default(ACTIVO)
  
  // Relaciones
  viajes: Viaje[]
  pausas: Pausa[]
}
```
**Status**: ✅ Existe

**Tabla VIAJE** (será SERVICIO)
```prisma
model Viaje {
  id: String @id @default(uuid())
  turno_id: String
  plataforma_id: String
  
  registrado_en: DateTime @default(now())
  
  valor_cop: Float                    ✅ Existe
  km_recogida: Float                  ✅ Existe
  km_recorrido: Float                 ✅ Existe
  tiempo_recogida_min: Int            ✅ Existe
  tiempo_total_min: Int               ✅ Existe
  
  calificacion_pasajero: Float?       ✅ Existe
  viajes_pasajero: Int?               ✅ Existe
  
  km_total: Float                     ✅ Existe
  valor_copkm: Float                  ✅ Existe (rentabilidad)
  semaforo: Semaforo                  ✅ Existe (VERDE|AMARILLO|ROJO)
  porcentaje_vs_umbral: Int           ✅ Existe
  
  aceptado: Boolean?                  ✅ Existe (null=sin decisión)
  
  @@map("viajes")
}

enum Semaforo {
  VERDE
  AMARILLO
  ROJO
}
```
**Status**: ✅ Existe, estructura completa

**Tabla PLATAFORMA**
```prisma
model Plataforma {
  id: String @id @default(uuid())
  nombre: String @unique
  package_android: String?
  bundle_ios: String?
  icono_url: String?
  activa: Boolean @default(true)
  
  viajes: Viaje[]
}
```
**Status**: ✅ Existe

### Backend Controllers/Routes

**Archivo**: `src/controllers/viajes.controller.ts`
```typescript
✅ getHistorial(req, res)     // GET /viajes?page&limit&estado
   - Paginación: page, limit (max 50)
   - Filtros: todos | aceptados | rechazados
   - Include: plataforma, turno
   
✅ getViaje(req, res)         // GET /viajes/:id
   - Detalle de un viaje
   - Validar que pertenece al conductor
   - Include: plataforma, turno
   
❌ crearServicio()            // Falta
❌ actualizarDecision()       // Falta (PUT aceptar/rechazar son stubs)
```

**Archivo**: `src/routes/viajes.routes.ts`
```typescript
GET  /            → getHistorial()
GET  /:id         → getViaje()
PUT  /:id/aceptar  → stub (501)
PUT  /:id/rechazar → stub (501)
```

**Status**: ✅ Estructura existe, falta POST y lógica de rentabilidad

### Middleware y Seguridad

**Auth Middleware**: `src/middleware/auth.middleware.ts`
- ✅ Verifica Firebase JWT
- ✅ Inyecta `req.conductor_id`
- ✅ Rechaza sin conductor válido

**Suscripción Middleware**: `src/middleware/suscripcion.middleware.ts`
- ✅ Verifica suscripción activa
- ✅ Se aplica a todas rutas privadas

**Status**: ✅ Ambos existentes y funcionando

### Testing

**Estructura actual**:
- ✅ Jest configurado
- ✅ `npm run test` funciona
- ✅ `npm run test:coverage` disponible
- ❌ Tests de RentabilidadService: no existen

---

## ❌ Lo Que FALTA

### 1. RentabilidadService
**Archivo**: `src/services/rentabilidad.service.ts` (NO EXISTE)

**Qué debe hacer**:
- Input: `valor_cop, km_recorrido, conductor_umbrales`
- Output: `{rentabilidad_cop_km, semaforo, porcentaje_vs_umbral, mensaje}`
- Lógica: Comparar rentabilidad contra umbrales → determinar semáforo

**Casos de uso**:
- VERDE: `rentabilidad >= umbral_verde`
- AMARILLO: `umbral_amarillo <= rentabilidad < umbral_verde`
- ROJO: `rentabilidad < umbral_amarillo`

**Status**: ❌ No existe

### 2. POST Crear Servicio
**Endpoint**: `POST /api/v1/servicios`

**Qué debe hacer**:
- Validar datos (valor_cop, km_recorrido, plataforma_id, turno_id)
- Validar que turno pertenece al conductor
- Validar que plataforma existe
- Calcular rentabilidad con RentabilidadService
- Crear registro en BD
- Retornar servicio + análisis

**Status**: ❌ No existe

### 3. PATCH Actualizar Decisión
**Endpoint**: `PATCH /api/v1/servicios/:id/decision`

**Qué debe hacer**:
- Body: `{aceptado: boolean}`
- Validar que servicio pertenece al conductor
- Actualizar campo `aceptado`
- Retornar servicio actualizado

**Status**: ❌ Existe como stub (501)

### 4. Renombrar Tabla en Schema
**De**: `Viaje` **a**: `Servicio`

**Cambios necesarios**:
1. `model Viaje` → `model Servicio`
2. `@@map("viajes")` → `@@map("servicios")`
3. Migración: `npx prisma migrate dev --name rename_viaje_to_servicio`

**Status**: ❌ No hecho

### 5. Renombrar Archivos
- ❌ `viajes.controller.ts` → `servicios.controller.ts`
- ❌ `viajes.routes.ts` → `servicios.routes.ts`
- ❌ Actualizar imports en `index.ts`

### 6. Tests
**Archivo**: `src/services/__tests__/rentabilidad.service.test.ts` (NO EXISTE)

**Qué debe testear**:
- VERDE: rentabilidad >= umbral_verde
- AMARILLO: en medio
- ROJO: < umbral_amarillo
- Validación: km > 0, valor >= 0
- Cálculo: porcentaje_vs_umbral correcto
- Mensaje: formatos esperados

**Status**: ❌ No existen

---

## 🏗️ Estructura Actual del Proyecto

```
farecheck-api/
├── src/
│   ├── controllers/
│   │   ├── auth.controller.ts           ✅
│   │   ├── conductor.controller.ts      ✅
│   │   ├── turnos.controller.ts         ✅
│   │   ├── viajes.controller.ts         ✅ (parcial)
│   │   ├── analisis.controller.ts       ✅
│   │   ├── balance.controller.ts        ✅
│   │   └── servicios.controller.ts      ❌ (será creado)
│   │
│   ├── routes/
│   │   ├── auth.routes.ts               ✅
│   │   ├── conductor.routes.ts          ✅
│   │   ├── turnos.routes.ts             ✅
│   │   ├── viajes.routes.ts             ✅ (parcial)
│   │   ├── analisis.routes.ts           ✅
│   │   ├── balance.routes.ts            ✅
│   │   └── servicios.routes.ts          ❌ (será creado)
│   │
│   ├── services/
│   │   ├── firebase.service.ts          ✅
│   │   └── rentabilidad.service.ts      ❌ (será creado)
│   │
│   ├── middleware/
│   │   ├── auth.middleware.ts           ✅
│   │   └── suscripcion.middleware.ts    ✅
│   │
│   └── index.ts                         ✅ (será actualizado)
│
├── prisma/
│   ├── schema.prisma                    ✅ (será actualizado)
│   ├── migrations/
│   │   └── ... (nuevos después de Paso 2)
│   └── seed.ts                          ✅
│
├── tests/
│   └── rentabilidad.service.test.ts     ❌ (será creado)
│
├── docs/
│   ├── ARCHITECTURE.md                  ✅
│   ├── SECURITY.md                      ✅
│   └── FASE2/                           📋 (siendo creado)
│
└── package.json                         ✅
```

---

## 🔌 Dependencias y Versiones

**Prisma**:
```json
"@prisma/client": "^5.7.0" ✅
"prisma": "^5.7.0" ✅
```

**Validación**:
```json
"zod": "^3.22.4" ✅ (ya en use)
```

**Testing**:
```json
"jest": "^29.0.0" ✅
"@types/jest": "^29.0.0" ✅
"ts-jest": "^29.0.0" ✅
```

**Backend**:
```json
"express": "^4.18.2" ✅
"firebase-admin": "^12.0.0" ✅
```

**Status**: ✅ No hay que agregar dependencias nuevas

---

## 🚀 Versión de Node y Tooling

```
Node: v18+ (o v20+)
npm: v9+
Prisma CLI: v5.7.0
TypeScript: v5.x
```

**Verificar con**:
```bash
node --version
npm --version
npx prisma --version
```

---

## 🌐 Entorno y Variables

**En Railway (producción)**:
```
DATABASE_URL=postgresql://...
FIREBASE_PROJECT_ID=farecheck-d7781
NODE_ENV=production
PORT=3000
```

**Localmente (.env)**:
```
DATABASE_URL=postgresql://local_user:password@localhost:5432/farecheck
FIREBASE_...=
NODE_ENV=development
PORT=3000
```

**Status**: ✅ Configurado correctamente (auditado en FASE 1)

---

## 📊 Diagnóstico Completado

### Tabla Viaje - Campos Disponibles

| Campo | Tipo | Existe | Usar en Paso |
|-------|------|--------|-------------|
| `id` | UUID | ✅ | Paso 4 |
| `valor_cop` | Float | ✅ | Paso 3, 4 |
| `km_recorrido` | Float | ✅ | Paso 3, 4 |
| `valor_copkm` | Float | ✅ | Paso 3 (calcular) |
| `semaforo` | Enum | ✅ | Paso 3 (asignar) |
| `porcentaje_vs_umbral` | Int | ✅ | Paso 3 (calcular) |
| `aceptado` | Boolean? | ✅ | Paso 5 (actualizar) |
| `turno_id` | FK | ✅ | Paso 4 (validar) |
| `plataforma_id` | FK | ✅ | Paso 4 (validar) |

**Conclusión**: ✅ Tabla tiene TODO lo necesario

### Rutas Existentes

```
✅ GET  /api/v1/viajes             (getHistorial)
✅ GET  /api/v1/viajes/:id          (getViaje)
❌ POST /api/v1/viajes              (falta)
❌ PATCH /api/v1/viajes/:id/decision (falta)
```

**Después de renombrar**:
```
✅ GET  /api/v1/servicios           (listarServicios)
✅ GET  /api/v1/servicios/:id       (obtenerServicio)
✅ POST /api/v1/servicios           (crearServicio) ← NUEVA
✅ PATCH /api/v1/servicios/:id/decision (actualizarDecision) ← NUEVA
```

---

## 🎯 Decisión Arquitectónica: Opción B

**Alternativas evaluadas**:
- A: Mantener `Viaje` tal cual (rápido pero semánticamente confuso)
- B: Renombrar `Viaje` → `Servicio` (recomendado)
- C: Crear tabla `Servicio` adicional (complejo, duplica lógica)

**Elegida**: **B - Renombrar**

**Razones**:
1. Tabla ya existe con estructura correcta
2. Semántica clara: `Servicio` = Oferta (pre-decisión)
3. Breaking change controlado
4. Implementación simple (6 pasos)
5. No hay mejor momento para hacerlo

**Impacto**:
- BD: Tabla renombrada automáticamente por migración
- API: `/viajes` → `/servicios` (breaking, pero versioned)
- Frontend: Cambiar llamadas a API
- Docs: Actualizar a términos "Servicio" y "Rentabilidad"

---

## 🔄 Dependencias Entre Pasos

```
PASO 1: Schema Prisma
    ↓
PASO 2: Migración BD (requiere PASO 1 ✅)
    ↓
PASO 3: RentabilidadService (no requiere PASO 1-2)
    ↓
PASO 4: Controllers (requiere PASO 1, 3)
    ↓
PASO 5: Routes (requiere PASO 4)
    ↓
PASO 6: index.ts (requiere PASO 5)
    ↓
Tests (requiere PASO 3, 4, 5)
    ↓
Deploy (requiere TODO)
```

**Orden obligatorio**: 1 → 2 → (3 en paralelo) → 4 → 5 → 6 → Tests → Deploy

---

## ✅ Validaciones Pre-Implementación

- ✅ Diagnóstico completado
- ✅ Decisión arquitectónica tomada (Opción B)
- ✅ Documentación Phase 0 hecha
- ✅ 6 pasos especificados
- ✅ Dependencias mapeadas
- ✅ No hay bloqueos externos
- ✅ Team alignment (Luis aprobó plan)

**Status**: 🚀 Listo para Paso 1

---

## 📝 Notas Importantes

1. **Migraciones**: Prisma las maneja automáticamente. Si algo sale mal, rollback es posible.

2. **BD Local**: Asegúrate de tener PostgreSQL corriendo para `npm run db:migrate`

3. **Cambios de ruta**: `/viajes` → `/servicios` requiere actualizar frontend DESPUÉS de Paso 6

4. **Tests**: No bloquean deploy, pero recomendado ejecutar antes

5. **Commits**: Un commit limpio por paso (6 commits totales)

---

## 🚀 Siguiente Paso

Abre `PASO1_SCHEMA.md` para comenzar implementación

