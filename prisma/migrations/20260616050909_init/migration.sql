-- CreateEnum
CREATE TYPE "Plan" AS ENUM ('TRIAL', 'MENSUAL', 'ANUAL');

-- CreateEnum
CREATE TYPE "EstadoSuscripcion" AS ENUM ('ACTIVA', 'EXPIRADA', 'CANCELADA');

-- CreateEnum
CREATE TYPE "EstadoTurno" AS ENUM ('ACTIVO', 'PAUSADO', 'FINALIZADO');

-- CreateEnum
CREATE TYPE "Semaforo" AS ENUM ('VERDE', 'AMARILLO', 'ROJO');

-- CreateTable
CREATE TABLE "conductores" (
    "id" TEXT NOT NULL,
    "firebase_uid" TEXT NOT NULL,
    "auth_provider" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "email" TEXT,
    "telefono" TEXT,
    "foto_url" TEXT,
    "placa_vehiculo" TEXT,
    "marca_vehiculo" TEXT,
    "modelo_vehiculo" TEXT,
    "anio_vehiculo" INTEGER,
    "umbral_verde_copkm" DOUBLE PRECISION NOT NULL DEFAULT 1500,
    "umbral_amarillo_copkm" DOUBLE PRECISION NOT NULL DEFAULT 900,
    "creado_en" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizado_en" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "conductores_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "suscripciones" (
    "id" TEXT NOT NULL,
    "conductor_id" TEXT NOT NULL,
    "plan" "Plan" NOT NULL,
    "estado" "EstadoSuscripcion" NOT NULL,
    "inicio" TIMESTAMP(3) NOT NULL,
    "fin" TIMESTAMP(3) NOT NULL,
    "stripe_customer_id" TEXT,
    "stripe_subscription_id" TEXT,
    "stripe_price_id" TEXT,
    "creado_en" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizado_en" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "suscripciones_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "plataformas" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "package_android" TEXT,
    "bundle_ios" TEXT,
    "icono_url" TEXT,
    "activa" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "plataformas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "turnos" (
    "id" TEXT NOT NULL,
    "conductor_id" TEXT NOT NULL,
    "inicio" TIMESTAMP(3) NOT NULL,
    "fin" TIMESTAMP(3),
    "estado" "EstadoTurno" NOT NULL DEFAULT 'ACTIVO',
    "total_viajes" INTEGER NOT NULL DEFAULT 0,
    "viajes_aceptados" INTEGER NOT NULL DEFAULT 0,
    "viajes_rechazados" INTEGER NOT NULL DEFAULT 0,
    "ingreso_total_cop" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "km_totales" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "tiempo_activo_min" INTEGER NOT NULL DEFAULT 0,
    "tiempo_pausa_min" INTEGER NOT NULL DEFAULT 0,
    "creado_en" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizado_en" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "turnos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pausas" (
    "id" TEXT NOT NULL,
    "turno_id" TEXT NOT NULL,
    "inicio" TIMESTAMP(3) NOT NULL,
    "fin" TIMESTAMP(3),

    CONSTRAINT "pausas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "viajes" (
    "id" TEXT NOT NULL,
    "turno_id" TEXT NOT NULL,
    "plataforma_id" TEXT NOT NULL,
    "registrado_en" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "valor_cop" DOUBLE PRECISION NOT NULL,
    "km_recogida" DOUBLE PRECISION NOT NULL,
    "km_recorrido" DOUBLE PRECISION NOT NULL,
    "tiempo_recogida_min" INTEGER NOT NULL,
    "tiempo_total_min" INTEGER NOT NULL,
    "calificacion_pasajero" DOUBLE PRECISION,
    "viajes_pasajero" INTEGER,
    "km_total" DOUBLE PRECISION NOT NULL,
    "valor_copkm" DOUBLE PRECISION NOT NULL,
    "semaforo" "Semaforo" NOT NULL,
    "porcentaje_vs_umbral" INTEGER NOT NULL,
    "aceptado" BOOLEAN,

    CONSTRAINT "viajes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contactos_emergencia" (
    "id" TEXT NOT NULL,
    "conductor_id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "telefono" TEXT NOT NULL,
    "relacion" TEXT NOT NULL,
    "orden" INTEGER NOT NULL,
    "creado_en" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "contactos_emergencia_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "conductores_firebase_uid_key" ON "conductores"("firebase_uid");

-- CreateIndex
CREATE UNIQUE INDEX "plataformas_nombre_key" ON "plataformas"("nombre");

-- AddForeignKey
ALTER TABLE "suscripciones" ADD CONSTRAINT "suscripciones_conductor_id_fkey" FOREIGN KEY ("conductor_id") REFERENCES "conductores"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "turnos" ADD CONSTRAINT "turnos_conductor_id_fkey" FOREIGN KEY ("conductor_id") REFERENCES "conductores"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pausas" ADD CONSTRAINT "pausas_turno_id_fkey" FOREIGN KEY ("turno_id") REFERENCES "turnos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "viajes" ADD CONSTRAINT "viajes_turno_id_fkey" FOREIGN KEY ("turno_id") REFERENCES "turnos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "viajes" ADD CONSTRAINT "viajes_plataforma_id_fkey" FOREIGN KEY ("plataforma_id") REFERENCES "plataformas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contactos_emergencia" ADD CONSTRAINT "contactos_emergencia_conductor_id_fkey" FOREIGN KEY ("conductor_id") REFERENCES "conductores"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
