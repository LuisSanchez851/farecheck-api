# FASE 2: MODELO DE SERVICIOS Y RENTABILIDAD
## Guía Maestra - Documentación Estructurada

**Estado**: Documentación Phase 0 ✅  
**Objetivo**: Implementar lógica de rentabilidad con semáforo VERDE/AMARILLO/ROJO  
**Estrategia**: 6 pasos secuenciales, cada uno con especificación clara  
**Tooling**: Claude Code (backend), documentación como fuente de verdad  

---

## 📋 Estructura de Documentos

```
FASE2/
├── README.md (este archivo)
├── CHECKPOINT.md
│   ├── Estado actual del proyecto
│   ├── Diagnóstico completado
│   ├── Decisión arquitectónica (Opción B)
│   └── Dependencias y pre-requisitos
│
├── PASO1_SCHEMA.md
│   ├── Especificación Prisma
│   ├── Cambios exactos a hacer
│   ├── Validaciones pre-cambio
│   └── Checklist completación
│
├── PASO2_MIGRACION.md
│   ├── Comando de migración
│   ├── Qué ocurre en BD
│   ├── Cómo validar
│   └── Rollback si es necesario
│
├── PASO3_RENTABILIDAD.md
│   ├── Especificación RentabilidadService
│   ├── Interfaz de entrada/salida
│   ├── Lógica de cálculo detallada
│   └── Casos edge
│
├── PASO4_CONTROLLERS.md
│   ├── Especificación de funciones
│   ├── Schemas Zod
│   ├── Validaciones
│   └── Errores esperados
│
├── PASO5_ROUTES.md
│   ├── Mapeo de endpoints
│   ├── Métodos HTTP
│   ├── Query/body/param specs
│   └── Ejemplos de request/response
│
├── PASO6_INDEX.md
│   ├── Cambios a index.ts
│   ├── Imports exactos
│   └── Middleware order
│
└── TESTING.md
    ├── Estrategia de testing
    ├── Tests unitarios (RentabilidadService)
    ├── Tests de integración (endpoints)
    └── Validación manual
```

---

## 🎯 Cómo Usar Esta Documentación

### Flujo Recomendado

**Sesión 1: PASO 1 (Schema)**
1. Abre `PASO1_SCHEMA.md`
2. Lee especificación completa
3. Abre Claude Code
4. Copia especificación como system prompt
5. Implementa cambios
6. Valida con `npx prisma validate`
7. Checkea ✅

**Sesión 2: PASO 2 (Migración)**
1. Abre `PASO2_MIGRACION.md`
2. Lee especificación
3. Ejecuta migración
4. Valida con `npx prisma studio`
5. Checkea ✅

**... (Sesión 3-8 para Pasos 3-6)**

### Cada Paso Tiene

✅ **Especificación clara** - Qué hay que hacer exactamente  
✅ **Código de ejemplo** - Referencia de cómo debería verse  
✅ **Validaciones** - Cómo verificar que funcionó  
✅ **Checklist** - Qué marcar cuando termines  
✅ **Notas importantes** - Cosas que fácilmente se olvidan  

---

## 📊 Timeline Estimado

| Paso | Componente | Tiempo | Status |
|------|-----------|--------|--------|
| 1 | Schema Prisma | 15 min | 📋 Documentado |
| 2 | Migración BD | 10 min | 📋 Documentado |
| 3 | RentabilidadService | 30 min | 📋 Documentado |
| 4 | Controllers | 45 min | 📋 Documentado |
| 5 | Routes | 20 min | 📋 Documentado |
| 6 | index.ts | 10 min | 📋 Documentado |
| — | Tests | 30 min | 📋 Documentado |
| — | Validación Manual | 20 min | 📋 Documentado |
| — | Deploy | 15 min | 📋 Documentado |
| **TOTAL** | | **~3.5 horas** | — |

---

## 🔗 Referencias Rápidas

**Documentación existente del proyecto**:
- `farecheck-api/README.md` - Overview
- `docs/ARCHITECTURE.md` - Decisiones técnicas
- `docs/SECURITY.md` - Credenciales (ya auditado)

**Archivos que se modifican**:
- `prisma/schema.prisma` (Paso 1)
- `src/services/rentabilidad.service.ts` (Paso 3, NUEVO)
- `src/controllers/servicios.controller.ts` (Paso 4, renombrado de viajes)
- `src/routes/servicios.routes.ts` (Paso 5, renombrado de viajes)
- `src/index.ts` (Paso 6)
- `src/services/__tests__/rentabilidad.service.test.ts` (Testing, NUEVO)

**Dependencias**:
- `@prisma/client` ^5.7.0 ✅
- `zod` para validación ✅
- `express` ya existe ✅
- No hay nuevas dependencias 🎉

---

## ⚠️ Decisiones Arquitectónicas Tomadas

### Opción B: Renombrar Viaje → Servicio

**Contexto**: El schema ya tenía tabla `Viaje` con campos correctos

**Decisión**: Renombrar en lugar de crear tabla nueva

**Por qué**:
- Tabla ya existe con estructura correcta
- Cambio semántico: `Servicio` = Oferta (pre-decisión), no Viaje (completado)
- Breaking change controlado ahora vs problemas después
- Plan claro y visible

**Impacto**:
- ✅ Schema: Una línea (model name + @@map)
- ✅ Frontend: Cambiar rutas `/viajes` → `/servicios`
- ✅ API: Versionada, compatible
- ✅ BD: Migración automática

---

## ✅ Pre-Requisitos Completados

- ✅ FASE 1: Autenticación (18 jun 2026)
- ✅ Auditoría Seguridad AWS (21 jun 2026)
- ✅ Diagnóstico arquitectónico
- ✅ Decisión de opción (B)
- ✅ Documentación Phase 0
- ⏳ **FALTA**: Implementación (Pasos 1-8)

---

## 🚀 Próximo Paso

→ Lee `CHECKPOINT.md` para entender dónde estamos  
→ Luego abre `PASO1_SCHEMA.md` para empezar

---

## 📝 Notas para Claude Code

Cuando abras Claude Code con cada paso:

**Prompt Template (Copia y pega en el chat)**:
```
@backend-architect

FASE 2 - PASO [N]: [Nombre]

LEE PRIMERO: docs/FASE2/PASO[N]_[NOMBRE].md

CONTEXTO:
- Estamos en FASE 2 de FareCheck
- Ejecutando Opción B: Renombrar Viaje → Servicio
- Este es PASO [N] de 6

TAREA:
[Específica para este paso, del documento]

CRITERIOS DE ACEPTACIÓN:
[Del documento PASO[N]]

VALIDACIÓN:
[Del documento PASO[N]]

NO HAGAS:
- Grandes refactors sin especificación
- Cambios en otros pasos
- Commits sin documentar
```

---

## 📚 Documentos Relacionados (Creados en FASE 2)

Después de completar esta fase, se crearán:
- `docs/RENTABILIDAD.md` - Documentación de usuario final
- `docs/SERVICIOS_API.md` - Especificación de APIs
- `SPRINTS.md` (actualizado) - Roadmap
- `CHECKPOINT.md` (actualizado) - Estado al cerrar FASE 2

