/**
 * Unit tests for /healthz liveness probe endpoint
 *
 * Requirements: 1.8, 1.10
 */

import { GET } from '@/app/healthz/route';

describe('GET /healthz', () => {
  it('should return HTTP 200 when app is running', async () => {
    const response = await GET();
    expect(response.status).toBe(200);
  });

  it('should return healthy status', async () => {
    const response = await GET();
    const data = await response.json();

    expect(data.healthy).toBe(true);
  });

  it('should include application check with ok status', async () => {
    const response = await GET();
    const data = await response.json();

    expect(data.checks).toBeDefined();
    expect(data.checks).toHaveLength(1);
    expect(data.checks[0]).toEqual({
      name: 'application',
      status: 'ok',
    });
  });
});
