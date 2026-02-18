/*
  Warnings:

  - You are about to drop the `ProfileSchema` table. If the table is not empty, all the data it contains will be lost.

*/
-- CreateEnum
CREATE TYPE "UserSchemaType" AS ENUM ('aggregate', 'formula');

-- DropForeignKey
ALTER TABLE "ProfileSchema" DROP CONSTRAINT "ProfileSchema_projectId_fkey";

-- DropTable
DROP TABLE "ProfileSchema";

-- CreateTable
CREATE TABLE "UserSchema" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "field" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "description" TEXT,
    "schemaType" "UserSchemaType" NOT NULL,
    "aggregateConfig" JSONB,
    "formula" TEXT,
    "dataType" TEXT NOT NULL,
    "format" TEXT,
    "icon" TEXT,
    "category" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserSchema_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "UserSchema_projectId_idx" ON "UserSchema"("projectId");

-- CreateIndex
CREATE UNIQUE INDEX "UserSchema_projectId_field_key" ON "UserSchema"("projectId", "field");

-- AddForeignKey
ALTER TABLE "UserSchema" ADD CONSTRAINT "UserSchema_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
