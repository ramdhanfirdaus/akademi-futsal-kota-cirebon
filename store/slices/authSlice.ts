import { createAsyncThunk, createSlice, type PayloadAction } from '@reduxjs/toolkit';
import api from '@/services/api';
import type { AuthState, User } from '@/types';

const initialState: AuthState = {
  user: null,
  status: 'idle',
  error: null,
};

/** Loads the current user from the session cookie; resolves to null when not logged in. */
export const fetchMe = createAsyncThunk('auth/fetchMe', async () => {
  try {
    const res: { data: User } = await api.get('/me');
    return res.data;
  } catch {
    return null;
  }
});

export const login = createAsyncThunk('auth/login', async ({ username, password }: { username: string; password: string }) => {
  const res: { data: { user: User } } = await api.post('/login', { username, password });
  return res.data.user;
});

export const logout = createAsyncThunk('auth/logout', async () => {
  await api.post('/logout', null);
});

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    clearAuth: (state) => {
      state.user = null;
      state.status = 'ready';
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchMe.pending, (state) => {
        if (state.status === 'idle') state.status = 'loading';
      })
      .addCase(fetchMe.fulfilled, (state, action: PayloadAction<User | null>) => {
        state.user = action.payload;
        state.status = 'ready';
      })
      .addCase(login.pending, (state) => {
        state.error = null;
      })
      .addCase(login.fulfilled, (state, action: PayloadAction<User>) => {
        state.user = action.payload;
        state.status = 'ready';
      })
      .addCase(login.rejected, (state, action) => {
        state.error = action.error.message ?? 'Login gagal';
      })
      // Clear local state even if the request failed: the user asked to leave this device.
      .addCase(logout.fulfilled, (state) => {
        state.user = null;
        state.status = 'ready';
      })
      .addCase(logout.rejected, (state) => {
        state.user = null;
        state.status = 'ready';
      });
  },
});

export const { clearAuth } = authSlice.actions;
export default authSlice.reducer;
