-- CreateTable
CREATE TABLE "IdHierarchy" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "codeName" TEXT NOT NULL,
    "priority" INTEGER NOT NULL,
    "isCustom" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "IdHierarchy_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "IdHierarchy_projectId_idx" ON "IdHierarchy"("projectId");

-- CreateIndex
CREATE UNIQUE INDEX "IdHierarchy_projectId_codeName_key" ON "IdHierarchy"("projectId", "codeName");

-- AddForeignKey
ALTER TABLE "IdHierarchy" ADD CONSTRAINT "IdHierarchy_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
