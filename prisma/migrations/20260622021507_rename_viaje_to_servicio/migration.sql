-- Rename table "viajes" -> "servicios" (data-preserving)
-- Manual migration: Prisma's default diff would DROP/CREATE and lose data,
-- so we use ALTER TABLE ... RENAME to preserve existing rows.
ALTER TABLE "viajes" RENAME TO "servicios";

-- Rename primary key constraint to match Prisma naming convention
ALTER TABLE "servicios" RENAME CONSTRAINT "viajes_pkey" TO "servicios_pkey";

-- Rename foreign key constraints to match Prisma naming convention
ALTER TABLE "servicios" RENAME CONSTRAINT "viajes_turno_id_fkey" TO "servicios_turno_id_fkey";
ALTER TABLE "servicios" RENAME CONSTRAINT "viajes_plataforma_id_fkey" TO "servicios_plataforma_id_fkey";
