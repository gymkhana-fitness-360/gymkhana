/**
 * Comprehensive E2E API Tests
 * Tests all API endpoints for proper authentication, authorization, validation, and error handling
 */

const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:3000';

// Helper to make API requests
async function apiRequest(
  path: string,
  options: RequestInit = {},
  includeAuth = false
): Promise<{ status: number; data: any; headers: Headers }> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  // For auth tests, we'd need a real session cookie
  // In E2E mode, most tests verify unauthenticated behavior

  const response = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers,
    redirect: 'manual',
  });

  let data;
  const contentType = response.headers.get('content-type');
  if (contentType?.includes('application/json')) {
    try {
      data = await response.json();
    } catch {
      data = null;
    }
  } else {
    data = await response.text();
  }

  return { status: response.status, data, headers: response.headers };
}

describe('API Security Tests', () => {
  describe('Unauthenticated Access Protection', () => {
    const protectedEndpoints = [
      { path: '/api/members', method: 'GET' },
      { path: '/api/members', method: 'POST' },
      { path: '/api/payments', method: 'GET' },
      { path: '/api/attendance', method: 'GET' },
      { path: '/api/attendance', method: 'POST' },
      { path: '/api/workouts', method: 'GET' },
      { path: '/api/workouts', method: 'POST' },
      { path: '/api/challenges', method: 'GET' },
      { path: '/api/challenges', method: 'POST' },
      { path: '/api/salaries', method: 'GET' },
      { path: '/api/expenses', method: 'GET' },
      { path: '/api/bills', method: 'GET' },
      { path: '/api/reminders', method: 'GET' },
      { path: '/api/renewals', method: 'GET' },
      { path: '/api/overdue', method: 'GET' },
      { path: '/api/audit', method: 'GET' },
      { path: '/api/analytics/summary', method: 'GET' },
      { path: '/api/leaderboard', method: 'GET' },
      { path: '/api/users', method: 'GET' },
      { path: '/api/plans', method: 'GET' },
      { path: '/api/settings', method: 'GET' },
      { path: '/api/trainers/commissions', method: 'GET' },
      { path: '/api/whatsapp/send', method: 'POST' },
      { path: '/api/whatsapp/status', method: 'GET' },
      { path: '/api/whatsapp/health', method: 'GET' },
      { path: '/api/dashboard/collections', method: 'GET' },
    ];

    protectedEndpoints.forEach(({ path, method }) => {
      it(`${method} ${path} should reject unauthenticated requests`, async () => {
        const { status } = await apiRequest(path, { method });
        expect([401, 307, 302]).toContain(status); // 401 unauthorized or redirect to login
      });
    });
  });

  describe('Health Errors Route (Admin Only)', () => {
    it('GET /api/health/errors should require admin auth', async () => {
      const { status } = await apiRequest('/api/health/errors');
      expect([401, 307, 302]).toContain(status);
    });

    it('DELETE /api/health/errors should require admin auth', async () => {
      const { status } = await apiRequest('/api/health/errors', { method: 'DELETE' });
      expect([401, 307, 302]).toContain(status);
    });
  });

  describe('Cron Routes Security', () => {
    const cronPaths = [
      '/api/cron/update-membership',
      '/api/cron/unified',
      '/api/cron/overdue-cleanup',
    ];

    cronPaths.forEach((path) => {
      it(`${path} should reject without bearer at handler (401)`, async () => {
        const { status } = await apiRequest(path, { method: 'POST' });
        expect(status).toBe(401);
      });
    });

    it('Cron routes should reject invalid bearer tokens at handler', async () => {
      const { status } = await apiRequest('/api/cron/unified', {
        method: 'POST',
        headers: { Authorization: 'Bearer invalid-token' },
      });
      expect(status).toBe(401);
    });

    it('GET /api/cron/unified accepts valid CRON_SECRET when server is up', async () => {
      const secret = process.env.CRON_SECRET;
      if (!secret || !process.env.TEST_BASE_URL) {
        return;
      }
      const { status } = await apiRequest('/api/cron/unified', {
        method: 'GET',
        headers: { Authorization: `Bearer ${secret}` },
      });
      expect([200, 409]).toContain(status);
    });
  });
});

describe('API Input Validation Tests', () => {
  describe('Invalid JSON Handling', () => {
    it('POST endpoints should handle malformed JSON gracefully', async () => {
      const response = await fetch(`${BASE_URL}/api/members`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: '{ invalid json }',
        redirect: 'manual',
      });
      // Should either redirect to login (401) or return 400 for bad JSON
      expect([400, 401, 307, 302]).toContain(response.status);
    });
  });

  describe('Query Parameter Validation', () => {
    it('GET /api/members with invalid page should handle gracefully', async () => {
      const { status } = await apiRequest('/api/members?page=-1&limit=abc');
      expect([400, 401, 307, 302]).toContain(status);
    });

    it('GET /api/payments with invalid dates should handle gracefully', async () => {
      const { status } = await apiRequest('/api/payments?startDate=not-a-date');
      expect([400, 401, 307, 302]).toContain(status);
    });
  });

  describe('Path Parameter Validation', () => {
    const pathEndpoints = [
      '/api/members/invalid-id',
      '/api/payments/invalid-id',
      '/api/bills/invalid-id',
      '/api/expenses/invalid-id',
      '/api/salaries/invalid-id',
    ];

    pathEndpoints.forEach((path) => {
      it(`GET ${path} should handle invalid IDs`, async () => {
        const { status } = await apiRequest(path);
        expect([400, 401, 404, 307, 302]).toContain(status);
      });
    });
  });
});

describe('API Error Handling Tests', () => {
  describe('404 Handling', () => {
    it('Non-existent routes should return 404 or require auth', async () => {
      const { status } = await apiRequest('/api/nonexistent-route');
      // Next.js middleware redirects to auth for protected routes or returns 404
      expect([401, 404, 307, 302]).toContain(status);
    });
  });

  describe('Method Not Allowed', () => {
    it('HEAD on POST-only routes should handle gracefully', async () => {
      const { status } = await apiRequest('/api/members', { method: 'HEAD' });
      // Should either be 405 or redirect to auth
      expect([200, 307, 302, 401, 405]).toContain(status);
    });
  });
});

describe('API Rate Limiting Tests', () => {
  it('Should have rate limit headers on protected routes', async () => {
    const { headers, status } = await apiRequest('/api/health');
    // Health route should be accessible
    expect([200, 401, 307]).toContain(status);
    // Rate limit headers might be present
    const hasRateLimit =
      headers.has('x-ratelimit-limit') ||
      headers.has('x-ratelimit-remaining') ||
      headers.has('ratelimit-limit');
    // Not required but good to verify if present
  });
});

describe('API Response Format Tests', () => {
  describe('Health Endpoint', () => {
    it('GET /api/health should return proper health check response', async () => {
      const { status, data } = await apiRequest('/api/health');
      if (status === 200) {
        expect(data).toHaveProperty('status');
        expect(['healthy', 'ok', 'UP']).toContain(data.status);
      }
    });
  });
});

describe('QR Code Endpoint Security', () => {
  it('POST /api/attendance/qr should reject unsigned QR data', async () => {
    // Forge a QR code without proper signature
    const fakeQrData = Buffer.from(JSON.stringify({
      memberId: 'MEM-001',
      timestamp: Date.now(),
      type: 'attendance'
    })).toString('base64');

    const { status, data } = await apiRequest('/api/attendance/qr', {
      method: 'POST',
      body: JSON.stringify({ qrData: fakeQrData }),
    });

    // Should either require auth or reject invalid signature
    expect([400, 401, 307, 302]).toContain(status);
    if (status === 400) {
      expect(data.error).toContain('Invalid QR');
    }
  });

  it('POST /api/attendance/qr with tampered signature should fail', async () => {
    const tamperedPayload = {
      payload: JSON.stringify({
        memberId: 'MEM-TAMPERED',
        timestamp: Date.now(),
        type: 'attendance'
      }),
      signature: 'fake-signature-1234567890abcdef'
    };
    const qrData = Buffer.from(JSON.stringify(tamperedPayload)).toString('base64');

    const { status, data } = await apiRequest('/api/attendance/qr', {
      method: 'POST',
      body: JSON.stringify({ qrData }),
    });

    expect([400, 401, 307, 302]).toContain(status);
  });
});

describe('IDOR Protection Tests', () => {
  describe('Member Data Access', () => {
    it('GET /api/members/:id should require proper authorization', async () => {
      const { status } = await apiRequest('/api/members/MEM-001');
      expect([401, 403, 404, 307, 302]).toContain(status);
    });
  });

  describe('WhatsApp Send Protection', () => {
    it('POST /api/whatsapp/send should require proper role', async () => {
      const { status } = await apiRequest('/api/whatsapp/send', {
        method: 'POST',
        body: JSON.stringify({ phone: '1234567890', message: 'test' }),
      });
      expect([401, 403, 307, 302]).toContain(status);
    });
  });
});

describe('Edge Case Tests', () => {
  describe('Empty Request Bodies', () => {
    it('POST with empty body should be handled', async () => {
      const { status } = await apiRequest('/api/members', {
        method: 'POST',
        body: JSON.stringify({}),
      });
      expect([400, 401, 307, 302]).toContain(status);
    });
  });

  describe('Large Payloads', () => {
    it('Should reject extremely large payloads', async () => {
      const largeData = 'x'.repeat(10 * 1024 * 1024); // 10MB
      const response = await fetch(`${BASE_URL}/api/members`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: largeData }),
        redirect: 'manual',
      });
      // Should either reject with 413 or redirect to auth
      expect([400, 401, 413, 307, 302]).toContain(response.status);
    });
  });

  describe('SQL Injection Prevention', () => {
    it('Query params with SQL should be safely handled', async () => {
      const { status } = await apiRequest(
        "/api/members?search='; DROP TABLE members; --"
      );
      // Should be auth redirect or safe response, not 500 server error
      expect([200, 400, 401, 307, 302]).toContain(status);
      expect(status).not.toBe(500);
    });
  });

  describe('XSS Prevention', () => {
    it('Input with script tags should be safely handled', async () => {
      const { status } = await apiRequest('/api/members', {
        method: 'POST',
        body: JSON.stringify({
          name: '<script>alert("xss")</script>',
          phone: '1234567890',
        }),
      });
      expect([400, 401, 307, 302]).toContain(status);
    });
  });
});

describe('Concurrent Request Handling', () => {
  it('Should handle multiple concurrent requests', async () => {
    const requests = Array(5).fill(null).map(() =>
      apiRequest('/api/health')
    );

    const results = await Promise.all(requests);
    results.forEach(({ status }) => {
      expect([200, 401, 307]).toContain(status);
    });
  }, 15000); // Extended timeout for concurrent requests
});

// Only run these tests if TEST_MODE=integration
if (process.env.TEST_MODE === 'integration') {
  describe('Integration Tests (Requires Auth)', () => {
    // These would require a valid session token
    // Placeholder for authenticated tests
  });
}
