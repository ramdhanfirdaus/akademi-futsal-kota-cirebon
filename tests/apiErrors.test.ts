import { describe, expect, it } from 'vitest';
import { apiErrorMessage } from '@/services/errors';

describe('apiErrorMessage', () => {
  it('explains a gateway timeout instead of a generic error', () => {
    for (const status of [502, 504]) {
      expect(apiErrorMessage({ response: { status, data: '<html>' } })).toMatch(/terlalu lama/);
    }
    expect(apiErrorMessage({ code: 'ECONNABORTED', message: 'timeout' })).toMatch(/terlalu lama/);
  });
  it('still prefers the server message', () => {
    expect(apiErrorMessage({ response: { status: 422, data: { message: 'x', errors: { a: ['Nama wajib'] } } } })).toBe('Nama wajib');
  });
});
