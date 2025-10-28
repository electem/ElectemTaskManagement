-- CreateEnum
CREATE TYPE "PeriodType" AS ENUM ('daily', 'weekly', 'monthly');

-- CreateTable
CREATE TABLE "DeveloperPerformanceMetric" (
    "id" SERIAL NOT NULL,
    "developerId" INTEGER NOT NULL,
    "periodType" "PeriodType" NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "cycleEfficiency" DOUBLE PRECISION,
    "totalLeadHours" DOUBLE PRECISION,
    "totalActiveHours" DOUBLE PRECISION,
    "completedTaskCount" INTEGER,
    "deliveryRatePerDay" DOUBLE PRECISION,
    "completedCount" INTEGER,
    "reworkRatio" DOUBLE PRECISION,
    "totalReopened" INTEGER,
    "computedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DeveloperPerformanceMetric_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "DeveloperPerformanceMetric_developerId_periodType_startDate_key" ON "DeveloperPerformanceMetric"("developerId", "periodType", "startDate", "endDate");
