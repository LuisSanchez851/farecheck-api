# FASE 2 - PASO 1: Schema Prisma
## Especificación Detallada

**Status**: 📋 Documentación  
**Objetivo**: Renombrar `Viaje` → `Servicio` en schema  
**Tiempo estimado**: 15 min  
**Complejidad**: ⭐ Muy baja  

---

## 🎯 Qué Hay Que Hacer

**Cambio Principal**: Renombrar tabla `Viaje` a `Servicio`

```prisma
# ANTES:
model Viaje {
  ...
  @@map("viajes")
}

# DESPUÉS:
model Servicio {
  ...
  @@map("servicios")
}
```

**¿Eso es todo?** SÍ. Ese es el único cambio necesario en el schema.

---

## 📋 Cambios Exactos

### Ubicación
**Archivo**: `prisma/schema.prisma`

### Cambio 1: Renombrar Model
```prisma
# LÍNEA: ~95 (aprox)

# ANTES:
model Viaje {

# DESPUÉS:
model Servicio {
```

### Cambio 2: Actualizar @@map
```prisma
# AL FINAL DEL MODEL (antes del cierre de llaves)

# ANTES:
  @@map("viajes")

# DESPUÉS:
  @@map("servicios")
```

### Cambio 3: Actualizar comentario (OPCIONAL pero recomendado)
```prisma
# AL INICIO DEL MODEL:

# ANTES:
// VIAJES — tabla central

# DESPUÉS:
// SERVICIOS — tabla central (ofertas evaluadas por conductor)
```

---

## 💻 Archivo Completo del Model

Esta es la versión COMPLETA de cómo debería verse `model Servicio`:

```prisma
// ──────────────────────────────────────────────────────────────────────────────
// SERVICIOS — ofertas de viaje evaluadas por el conductor (pre-decisión)
// ──────────────────────────────────────────────────────────────────────────────
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

  // null = no registró decisión, true = aceptó, false = rechazó
  aceptado Boolean?

  @@map("servicios")
}
```

---

## ✅ Validaciones Antes de Cambiar

**Antes de tocar el archivo**, verifica:

### 1. Backup (Recomendado)
```bash
cp prisma/schema.prisma prisma/schema.prisma.backup
```

### 2. Validar Schema Actual
```bash
npx prisma validate
```
**Esperado**: ✅ Sin errores

### 3. Ver BD Actual
```bash
npx prisma studio
```
**Esperado**: 
- Tabla `viajes` existe
- Tiene datos (probablemente vacía en dev)
- Estructura coincide con model `Viaje`

---

## 🔄 Paso a Paso

### Paso 1.1: Abrir Schema
```bash
# En tu editor
open prisma/schema.prisma
# o
code prisma/schema.prisma
```

### Paso 1.2: Encontrar el Model
Busca (Ctrl+F): `model Viaje`

Debería encontrarse en línea ~95

### Paso 1.3: Cambiar Nombre
```prisma
# Cambiar:
model Viaje {

# A:
model Servicio {
```

### Paso 1.4: Cambiar @@map
```prisma
# Encontrar (Ctrl+F): @@map("viajes")
# Cambiar a:
@@map("servicios")
```

### Paso 1.5: Actualizar Comentario (Opcional)
```prisma
# Cambiar comentario de:
// VIAJES — tabla central

# A:
// SERVICIOS — tabla central (ofertas evaluadas por conductor)
```

### Paso 1.6: Guardar
```bash
Ctrl+S (o Cmd+S en Mac)
```

---

## ✅ Validar Cambios

### Validación 1: Sintaxis Prisma
```bash
npx prisma validate
```

**Esperado**: 
```
✓ Your schema is valid
```

**Si falla**: 
- Verifica que renombraste AMBOS lugares (model + @@map)
- Asegúrate que no hay typos
- Usa backup si es necesario: `cp prisma/schema.prisma.backup prisma/schema.prisma`

### Validación 2: Generar Cliente
```bash
npx prisma generate
```

**Esperado**:
```
✓ Generated Prisma Client
```

**Qué hace**: Regenera tipos TypeScript para el nuevo model `Servicio`

### Validación 3: Revisar Archivo
```bash
# Verifica que el cambio está ahí
grep -n "model Servicio" prisma/schema.prisma
grep -n '@@map("servicios")' prisma/schema.prisma
```

**Esperado**: 
```
95:model Servicio {
158:  @@map("servicios")
```

---

## 🔍 Qué NO Cambiar

**Importante**: SOLO cambia lo especificado arriba.

❌ **NO cambies**:
- Nombres de campos (valor_cop, km_recorrido, etc)
- Tipos de datos
- Relaciones (Turno, Plataforma)
- Enum Semaforo
- Otros models (Conductor, Turno, Plataforma, etc)

❌ **NO agregues**:
- Campos nuevos
- Relaciones nuevas
- Índices nuevos

---

## 📊 Checklist de Completación

- [ ] Abierto `prisma/schema.prisma`
- [ ] Encontrado `model Viaje`
- [ ] Renombrado a `model Servicio`
- [ ] Encontrado `@@map("viajes")`
- [ ] Cambiado a `@@map("servicios")`
- [ ] Actualizado comentario (opcional)
- [ ] Guardado archivo
- [ ] Ejecutado `npx prisma validate` ✅
- [ ] Ejecutado `npx prisma generate` ✅
- [ ] Validado con `grep` que cambios están ahí
- [ ] Commit: `git add prisma/schema.prisma && git commit -m "docs(schema): rename Viaje to Servicio model"`

---

## 🚨 Errores Comunes

### Error 1: "Cannot find model 'Viaje'"
**Síntoma**: `npx prisma validate` falla con error sobre modelo desconocido

**Causa**: Renombraste el model pero algo quedó mal

**Solución**: 
```bash
# Verifica el modelo
grep "model Servicio" prisma/schema.prisma
# Asegúrate que la línea se vea bien (sin typos)
# Luego: npx prisma validate
```

### Error 2: "Relation 'Viaje' does not exist"
**Síntoma**: Otros models todavía apuntan a `Viaje`

**Causa**: Otros models tienen relaciones a `Viaje` que no fueron actualizadas

**Solución**: En este proyecto NO hay otros models apuntando a `Viaje` directamente. Si ves este error, significa que Prisma está confundido. Reinstala cliente:
```bash
rm -rf node_modules/.prisma
npx prisma generate
```

### Error 3: Changes are not applied, schema is still old
**Síntoma**: Después de cambios, `npx prisma validate` sigue mostrando `Viaje`

**Causa**: El archivo no se guardó

**Solución**: 
```bash
# Verifica que el archivo tiene los cambios
cat prisma/schema.prisma | grep "model Servicio"
# Si no aparece, el cambio no se guardó
# Guarda de nuevo: Ctrl+S en el editor
```

---

## 💡 Por Qué Este Cambio

**Contexto**: 
- Tabla `Viaje` almacena ofertas/servicios QUE EL CONDUCTOR EVALÚA
- En versiones futuras, habrá tabla `Viaje` para viajes COMPLETADOS
- Por eso el renombramiento es importante

**Semántica**:
- `Servicio` = Oferta que aparece en pantalla (pre-decisión)
- Conductor ve el semáforo (VERDE/AMARILLO/ROJO)
- Acepta o rechaza la oferta
- Si acepta → se convierte en `Viaje` (completado, historizado)

**Esto afecta terminología en TODO el proyecto**:
- APIs: `/viajes` → `/servicios` (Paso 5)
- Controllers: `viajes.controller.ts` → `servicios.controller.ts` (Paso 4)
- Routes: `viajes.routes.ts` → `servicios.routes.ts` (Paso 5)
- Docs: Updated to use "Servicio" term

---

## 🔗 Siguiente Paso

Una vez validado ✅, pasa a **PASO 2: Migración BD**

**Orden**:
1. ✅ PASO 1: Schema (estás aquí)
2. → PASO 2: Migración DB
3. → PASO 3: RentabilidadService
4. → PASO 4: Controllers
5. → PASO 5: Routes
6. → PASO 6: index.ts

