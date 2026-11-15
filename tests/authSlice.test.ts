import { describe, expect, it } from 'vitest';
// Load the store first: authSlice -> api -> store is a cycle that only resolves in this order.
import '@/store';
import authReducer, { logout } from '@/store/slices/authSlice';

describe('auth slice', () => {
  it('clears the user even when the logout request fails', () => {
    const state = { user: { id: 1 } as never, status: 'ready' as const, error: null };
    const next = authReducer(state, logout.rejected(new Error('network'), 'req'));
    expect(next.user).toBeNull();
    expect(next.status).toBe('ready');
  });
});
