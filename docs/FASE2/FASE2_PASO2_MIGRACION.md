# FASE 2 - PASO 2: Migración de Base de Datos
## Especificación Detallada

**Status**: 📋 Documentación  
**Prerequisito**: PASO 1 completado ✅  
**Objetivo**: Renombrar tabla en BD de "viajes" a "servicios"  
**Tiempo estimado**: 10 min  
**Complejidad**: ⭐ Muy baja  

---

## 🎯 Qué Hay Que Hacer

Ejecutar migración Prisma que:
1. Detecta cambio de modelo `Viaje` → `Servicio`
2. Crea archivo de migración SQL
3. Renombra tabla en BD (si usa `@@map`)
4. Actualiza cliente Prisma

**Resultado**: Tabla "viajes" se convierte a "servicios"

---

## 💻 Comandos Exactos

### Paso 2.1: Crear Migración
```bash
cd farecheck-api
npx prisma migrate dev --name rename_viaje_to_servicio
```

**¿Qué ocurre?**
1. Prisma detecta que el model cambió de nombre
2. Te pregunta si quieres crear una migración:
   ```
   ✔ Enter a name for the new migration: › rename_viaje_to_servicio
   ```
3. Crea carpeta: `prisma/migrations/TIMESTAMP_rename_viaje_to_servicio/`
4. Ejecuta migración en BD local
5. Regenera cliente Prisma

**Salida esperada**:
```
✔ Created migration: prisma/migrations/20260621120000_rename_viaje_to_servicio/

✔ Generated Prisma Client
```

### Paso 2.2: Verificar Migración Creada
```bash
# Listar migraciones
ls -la prisma/migrations/ | tail -2

# Deberías ver carpeta nueva:
# 20260621120000_rename_viaje_to_servicio
```

### Paso 2.3: Revisar Archivo SQL
```bash
cat prisma/migrations/$(ls -t prisma/migrations | head -1)/migration.sql
```

**Esperado**: Algo como:
```sql
-- AlterTable
ALTER TABLE "viajes" RENAME TO "servicios";
```

---

## ✅ Validar Migración

### Validación 1: Base de Datos Local
```bash
npx prisma studio
```

**Qué verificar**:
1. En el panel izquierdo, debería haber una tabla llamada "servicios"
2. Ya NO debería haber tabla "viajes"
3. La tabla "servicios" tiene los mismos campos que antes

**Si ves "viajes"**: La migración no se ejecutó correctamente

### Validación 2: Datos Preservados
```bash
npx prisma db execute --stdin << 'EOF'
SELECT COUNT(*) FROM servicios;
EOF
```

**Esperado**: Si había datos en "viajes", deberían estar en "servicios"

### Validación 3: Schema Actualizado
```bash
npx prisma generate
```

**Qué verifica**: Que cliente Prisma entiende el nuevo model

**Esperado**:
```
✓ Generated Prisma Client
```

---

## 🔍 Qué Cambió Exactamente

### En la Base de Datos
```
ANTES:  Tabla "viajes" con 9 columnas
DESPUÉS: Tabla "servicios" con 9 columnas (mismos datos)
```

### En el Cliente Prisma
```
ANTES:  prisma.viaje.findMany(), prisma.viaje.create(), etc.
DESPUÉS: prisma.servicio.findMany(), prisma.servicio.create(), etc.
```

### En el Schema
```
ANTES:  model Viaje { ... }
DESPUÉS: model Servicio { ... }
```

### En Migraciones
```
ANTES:  Última migración es sobre autenticación/conductor
DESPUÉS: Nueva migración "rename_viaje_to_servicio" agregada
```

---

## 🚨 Errores Posibles y Soluciones

### Error 1: "Database connection failed"
**Síntoma**: 
```
Error: Connection failed to: postgresql://...
```

**Causa**: PostgreSQL no está corriendo o `.env` es incorrecto

**Solución**:
```bash
# Verifica que PostgreSQL está corriendo
# En Mac: brew services start postgresql
# En Linux: sudo service postgresql start

# Verifica DATABASE_URL en .env
cat .env | grep DATABASE_URL

# Reintentar:
npx prisma migrate dev --name rename_viaje_to_servicio
```

### Error 2: "Cannot find migration"
**Síntoma**: 
```
Migration failed: Cannot find migration
```

**Causa**: Hay cambios en el schema que no coinciden con migraciones previas

**Solución**:
```bash
# Resincronizar BD con schema (CUIDADO: borra datos locales)
npx prisma migrate reset

# Luego:
npx prisma migrate dev --name rename_viaje_to_servicio
```

### Error 3: "Table 'viajes' not found"
**Síntoma**: 
```
Error: Table 'viajes' not found
```

**Causa**: Probablemente la migración anterior falló

**Solución**:
```bash
# Verificar estado migraciones
npx prisma migrate status

# Si dice "Drift detected", significa que BD y schema no coinciden
# Opciones:
# 1. Resolver drift manualmente (avanzado)
# 2. Reset (si estás en dev): npx prisma migrate reset
```

### Error 4: "Model Servicio not found" después de migrar
**Síntoma**: Al intentar usar `prisma.servicio`, falla con "Unknown model"

**Causa**: Cliente Prisma no fue regenerado

**Solución**:
```bash
npx prisma generate
```

---

## 📝 Qué NOT Hacer

❌ **NO manifiestes cambios manualmente** en la BD
- Deja que Prisma maneje las migraciones
- Si tocas la BD directamente, Prisma se confunde

❌ **NO borres la carpeta** `prisma/migrations/`
- Contiene historial de cambios
- Necesaria para que Railway sepa qué migraciones aplicar

❌ **NO cambies el timestamp** en el nombre de migración
- Prisma lo genera automáticamente
- Es parte del control de versiones

---

## 🔄 Workflow Completo

```bash
# 1. Hiciste cambio en schema (PASO 1)
#    model Viaje { ... } → model Servicio { ... }

# 2. Ejecutas migración (PASO 2)
cd farecheck-api
npx prisma migrate dev --name rename_viaje_to_servicio

# 3. Verificas en prisma studio
npx prisma studio
# → Ves "servicios" en lista de tablas

# 4. Regeneras cliente
npx prisma generate

# 5. Verificas que funciona
npm run dev
# → App inicia sin errores
```

---

## 📊 Checklist de Completación

- [ ] PASO 1 completado ✅
- [ ] PostgreSQL corriendo (`sudo service postgresql status`)
- [ ] `.env` con `DATABASE_URL` válido
- [ ] Ejecutado `npx prisma migrate dev --name rename_viaje_to_servicio`
- [ ] Migración creada en `prisma/migrations/`
- [ ] Verificado SQL con `cat prisma/migrations/.../migration.sql`
- [ ] Abierto `npx prisma studio` y visto tabla "servicios"
- [ ] Ejecutado `npx prisma generate` ✅
- [ ] Verificado con `npm run build` que compila sin errores
- [ ] Commit: `git add prisma/migrations && git commit -m "feat(db): migrate Viaje table to Servicios"`

---

## 🎓 Entendiendo Migraciones

### ¿Por qué `@@map("servicios")`?

Quando usas `@@map` en Prisma:
```prisma
model Servicio {
  ...
  @@map("servicios")
}
```

Significa: "El model se llama `Servicio` en TypeScript, pero la tabla en BD se llama `servicios`"

**Ventaja**: Puedes tener nombres diferentes
- TypeScript sigue convención PascalCase: `Servicio`
- SQL sigue convención snake_case: `servicios`

### ¿Cómo detecta Prisma que cambió?

Prisma lee:
1. Schema actual (`prisma/schema.prisma`)
2. Último estado conocido (`prisma/migrations/`)
3. Compara
4. Crea migración con cambios

Si cambias `@@map("viajes")` → `@@map("servicios")`, Prisma detecta: "Alguien renombró la tabla"

### ¿Qué ocurre en BD?

```sql
-- Migration SQL generado
ALTER TABLE "viajes" RENAME TO "servicios";
```

Simple: Renombra tabla, preserva todos los datos

---

## 🚀 Próximo Paso

Una vez validado ✅, pasa a **PASO 3: RentabilidadService**

**Orden**:
1. ✅ PASO 1: Schema
2. ✅ PASO 2: Migración (estás aquí)
3. → PASO 3: RentabilidadService
4. → PASO 4: Controllers
5. → PASO 5: Routes
6. → PASO 6: index.ts

