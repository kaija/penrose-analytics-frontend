-- CreateTable
CREATE TABLE "IdMapping" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "idType" TEXT NOT NULL,
    "idValue" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3),

    CONSTRAINT "IdMapping_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
-- Composite unique index for fast lookups by project + type + value
CREATE UNIQUE INDEX "IdMapping_projectId_idType_idValue_key" ON "IdMapping"("projectId", "idType", "idValue");

-- CreateIndex
-- Index for reverse lookups (find all IDs for a profile)
CREATE INDEX "IdMapping_profileId_idx" ON "IdMapping"("profileId");

-- CreateIndex
-- Index for cleanup queries (delete expired temporary IDs)
CREATE INDEX "IdMapping_expiresAt_idx" ON "IdMapping"("expiresAt") WHERE "expiresAt" IS NOT NULL;

-- CreateIndex
-- Index for type-based queries
CREATE INDEX "IdMapping_projectId_idType_idx" ON "IdMapping"("projectId", "idType");

-- AddForeignKey
ALTER TABLE "IdMapping" ADD CONSTRAINT "IdMapping_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IdMapping" ADD CONSTRAINT "IdMapping_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "Profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Create function to clean up expired ID mappings
CREATE OR REPLACE FUNCTION cleanup_expired_id_mappings()
RETURNS void AS $$
BEGIN
    DELETE FROM "IdMapping"
    WHERE "expiresAt" IS NOT NULL
    AND "expiresAt" < NOW();
END;
$$ LANGUAGE plpgsql;

-- Add comment for documentation
COMMENT ON TABLE "IdMapping" IS 'High-performance ID mapping table for resolving various ID types (email, idfa, session, cookie) to profile IDs';
COMMENT ON COLUMN "IdMapping"."idType" IS 'Type of identifier (e.g., email, idfa, session, cookie, device_id)';
COMMENT ON COLUMN "IdMapping"."idValue" IS 'The actual identifier value';
COMMENT ON COLUMN "IdMapping"."profileId" IS 'The unified profile ID this identifier maps to';
COMMENT ON COLUMN "IdMapping"."expiresAt" IS 'Optional expiration timestamp for temporary IDs like sessions and cookies';
