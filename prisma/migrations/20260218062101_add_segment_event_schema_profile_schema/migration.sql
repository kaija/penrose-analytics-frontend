-- CreateTable
CREATE TABLE "Segment" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "filterConfig" JSONB NOT NULL,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Segment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EventSchema" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "eventName" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "icon" TEXT,
    "properties" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EventSchema_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProfileSchema" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "field" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "dataType" TEXT NOT NULL,
    "icon" TEXT,
    "category" TEXT,
    "suggestedValues" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProfileSchema_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Segment_projectId_idx" ON "Segment"("projectId");

-- CreateIndex
CREATE UNIQUE INDEX "Segment_projectId_name_key" ON "Segment"("projectId", "name");

-- CreateIndex
CREATE INDEX "EventSchema_projectId_idx" ON "EventSchema"("projectId");

-- CreateIndex
CREATE UNIQUE INDEX "EventSchema_projectId_eventName_key" ON "EventSchema"("projectId", "eventName");

-- CreateIndex
CREATE INDEX "ProfileSchema_projectId_idx" ON "ProfileSchema"("projectId");

-- CreateIndex
CREATE UNIQUE INDEX "ProfileSchema_projectId_field_key" ON "ProfileSchema"("projectId", "field");

-- AddForeignKey
ALTER TABLE "Segment" ADD CONSTRAINT "Segment_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventSchema" ADD CONSTRAINT "EventSchema_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProfileSchema" ADD CONSTRAINT "ProfileSchema_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
