/**
 * Basic setup test to verify the testing infrastructure works
 */

import { prisma } from '@/lib/prisma';

describe('Project Setup', () => {
  it('should have a working test environment', () => {
    expect(true).toBe(true);
  });

  it('should be able to import Prisma client', () => {
    expect(prisma).toBeDefined();
  });
});
