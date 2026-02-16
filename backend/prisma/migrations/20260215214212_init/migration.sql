-- CreateEnum
CREATE TYPE "Role" AS ENUM ('ADMIN', 'TECHNICAL', 'OPERATOR');

-- CreateEnum
CREATE TYPE "ExpedienteStatus" AS ENUM ('EN_CURSO', 'PENDIENTE_DOCUMENTOS', 'LISTO_TRAMITAR', 'TRAMITADO_GVA', 'CERRADO');

-- CreateEnum
CREATE TYPE "ConductorMaterial" AS ENUM ('COBRE', 'ALUMINIO');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'OPERATOR',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Client" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "nif" TEXT NOT NULL,
    "phone" TEXT,
    "email" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Client_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Installation" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "municipality" TEXT NOT NULL,
    "postalCode" TEXT NOT NULL,
    "cups" TEXT,
    "contractedPower" DOUBLE PRECISION,
    "retailer" TEXT,
    "tariff" TEXT,
    "observations" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Installation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Expediente" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "status" "ExpedienteStatus" NOT NULL DEFAULT 'EN_CURSO',
    "type" TEXT NOT NULL,
    "operatorId" TEXT NOT NULL,
    "technicalId" TEXT,
    "installationId" TEXT NOT NULL,
    "visitDate" TIMESTAMP(3),
    "gvaRegisterNum" TEXT,
    "presentationDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Expediente_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Authorization" (
    "id" TEXT NOT NULL,
    "expedienteId" TEXT NOT NULL,
    "signaturePath" TEXT,
    "idCardPath" TEXT,
    "signedAt" TIMESTAMP(3),
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "pdfPath" TEXT,

    CONSTRAINT "Authorization_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DerivacionIndividual" (
    "id" TEXT NOT NULL,
    "expedienteId" TEXT NOT NULL,
    "section" DOUBLE PRECISION NOT NULL,
    "material" "ConductorMaterial" NOT NULL,
    "insulation" TEXT NOT NULL,
    "channeling" TEXT NOT NULL,
    "description" TEXT,

    CONSTRAINT "DerivacionIndividual_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DerivacionPhoto" (
    "id" TEXT NOT NULL,
    "derivacionId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "type" TEXT NOT NULL,

    CONSTRAINT "DerivacionPhoto_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Cuadro" (
    "id" TEXT NOT NULL,
    "expedienteId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "photoFrontal" TEXT,
    "photoInterior" TEXT,

    CONSTRAINT "Cuadro_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MainBreaker" (
    "id" TEXT NOT NULL,
    "cuadroId" TEXT NOT NULL,
    "poles" INTEGER NOT NULL,
    "amperage" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "MainBreaker_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Differential" (
    "id" TEXT NOT NULL,
    "cuadroId" TEXT NOT NULL,
    "poles" INTEGER NOT NULL,
    "amperage" DOUBLE PRECISION NOT NULL,
    "sensitivity" DOUBLE PRECISION NOT NULL,
    "description" TEXT,

    CONSTRAINT "Differential_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Circuit" (
    "id" TEXT NOT NULL,
    "cuadroId" TEXT NOT NULL,
    "differentialId" TEXT,
    "poles" INTEGER NOT NULL,
    "amperage" DOUBLE PRECISION NOT NULL,
    "description" TEXT NOT NULL,

    CONSTRAINT "Circuit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Verificacion" (
    "id" TEXT NOT NULL,
    "expedienteId" TEXT NOT NULL,
    "continuity" TEXT,
    "insulation" TEXT,
    "earthResistance" TEXT,
    "differentialTrip" TEXT,
    "notes" TEXT,

    CONSTRAINT "Verificacion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Document" (
    "id" TEXT NOT NULL,
    "expedienteId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "path" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Document_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Expediente_code_key" ON "Expediente"("code");

-- CreateIndex
CREATE UNIQUE INDEX "Authorization_expedienteId_key" ON "Authorization"("expedienteId");

-- CreateIndex
CREATE UNIQUE INDEX "DerivacionIndividual_expedienteId_key" ON "DerivacionIndividual"("expedienteId");

-- CreateIndex
CREATE UNIQUE INDEX "MainBreaker_cuadroId_key" ON "MainBreaker"("cuadroId");

-- CreateIndex
CREATE UNIQUE INDEX "Verificacion_expedienteId_key" ON "Verificacion"("expedienteId");

-- AddForeignKey
ALTER TABLE "Installation" ADD CONSTRAINT "Installation_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Expediente" ADD CONSTRAINT "Expediente_operatorId_fkey" FOREIGN KEY ("operatorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Expediente" ADD CONSTRAINT "Expediente_technicalId_fkey" FOREIGN KEY ("technicalId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Expediente" ADD CONSTRAINT "Expediente_installationId_fkey" FOREIGN KEY ("installationId") REFERENCES "Installation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Authorization" ADD CONSTRAINT "Authorization_expedienteId_fkey" FOREIGN KEY ("expedienteId") REFERENCES "Expediente"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DerivacionIndividual" ADD CONSTRAINT "DerivacionIndividual_expedienteId_fkey" FOREIGN KEY ("expedienteId") REFERENCES "Expediente"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DerivacionPhoto" ADD CONSTRAINT "DerivacionPhoto_derivacionId_fkey" FOREIGN KEY ("derivacionId") REFERENCES "DerivacionIndividual"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Cuadro" ADD CONSTRAINT "Cuadro_expedienteId_fkey" FOREIGN KEY ("expedienteId") REFERENCES "Expediente"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MainBreaker" ADD CONSTRAINT "MainBreaker_cuadroId_fkey" FOREIGN KEY ("cuadroId") REFERENCES "Cuadro"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Differential" ADD CONSTRAINT "Differential_cuadroId_fkey" FOREIGN KEY ("cuadroId") REFERENCES "Cuadro"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Circuit" ADD CONSTRAINT "Circuit_cuadroId_fkey" FOREIGN KEY ("cuadroId") REFERENCES "Cuadro"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Circuit" ADD CONSTRAINT "Circuit_differentialId_fkey" FOREIGN KEY ("differentialId") REFERENCES "Differential"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Verificacion" ADD CONSTRAINT "Verificacion_expedienteId_fkey" FOREIGN KEY ("expedienteId") REFERENCES "Expediente"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Document" ADD CONSTRAINT "Document_expedienteId_fkey" FOREIGN KEY ("expedienteId") REFERENCES "Expediente"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
