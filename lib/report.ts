/**
 * Report Management Module
 * 
 * Provides functions for managing report CRUD operations.
 * Reports are saved analytics queries with specific parameters.
 * 
 * Requirements: 8.7, 8.8
 */

import { prisma } from './prisma';
import { NotFoundError } from './errors';

/**
 * Create a new report
 * 
 * @param projectId - The ID of the project
 * @param name - The name of the report
 * @param category - The category of the report
 * @returns The created report
 * 
 * Requirements: 8.7
 */
export async function createReport(
  projectId: string,
  name: string,
  category: string
) {
  const report = await prisma.report.create({
    data: {
      projectId,
      name,
      category,
      config: {},
    },
  });

  return report;
}

/**
 * Get all reports for a project
 * 
 * @param projectId - The ID of the project
 * @returns Array of reports
 * 
 * Requirements: 8.8
 */
export async function getProjectReports(projectId: string) {
  const reports = await prisma.report.findMany({
    where: {
      projectId,
    },
    orderBy: {
      createdAt: 'desc',
    },
  });

  return reports;
}

/**
 * Get a report by ID
 * 
 * @param reportId - The ID of the report
 * @returns The report or null if not found
 * 
 * Requirements: 8.8
 */
export async function getReport(reportId: string) {
  const report = await prisma.report.findUnique({
    where: {
      id: reportId,
    },
  });

  return report;
}

/**
 * Update a report
 * 
 * @param reportId - The ID of the report
 * @param updates - The fields to update
 * @returns The updated report
 * @throws NotFoundError if report doesn't exist
 * 
 * Requirements: 8.8
 */
export async function updateReport(
  reportId: string,
  updates: { name?: string; category?: string; config?: Record<string, any> }
) {
  const report = await prisma.report.findUnique({
    where: { id: reportId },
  });

  if (!report) {
    throw new NotFoundError('Report');
  }

  const updatedReport = await prisma.report.update({
    where: { id: reportId },
    data: updates,
  });

  return updatedReport;
}

/**
 * Delete a report
 * 
 * @param reportId - The ID of the report
 * @throws NotFoundError if report doesn't exist
 * 
 * Requirements: 8.8
 */
export async function deleteReport(reportId: string) {
  const report = await prisma.report.findUnique({
    where: { id: reportId },
  });

  if (!report) {
    throw new NotFoundError('Report');
  }

  await prisma.report.delete({
    where: { id: reportId },
  });
}
