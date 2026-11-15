import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import api from '@/services/api';
import { AuthState, User } from '@/types';
import { RootState } from '@/store';

const initialState: AuthState = {
    user: null,
    tempToken: null,
    isAuthenticated: false,
    isLoading: false,
    error: null,
};

const authSlice = createSlice({
    name: 'auth',
    initialState,
    reducers: {
        setTempToken: (state, action: PayloadAction<string>) => {
            state.tempToken = action.payload;
        },
        clearTempToken: (state) => {
            state.tempToken = null;
        },
        clearAuth: (state) => {
            state.user = null;
            state.isAuthenticated = false;
        }
    }
    ,
    extraReducers: (builder) => {
        builder
            // Login
            .addCase(login.pending, (state) => {
                state.isLoading = true;
                state.error = null;
            })
            .addCase(login.fulfilled, (state, action: PayloadAction<User>) => {
                state.user = action.payload;
                state.isAuthenticated = true;
                state.isLoading = false;
            })
            .addCase(login.rejected, (state, action) => {
                state.isLoading = false;
                state.error = action.error.message || 'Login failed';
            })
            // Logout
            .addCase(logout.fulfilled, (state) => {
                state.user = null;
                state.isAuthenticated = false;
            });
    },
});

export const login = createAsyncThunk(
    'auth/login',
    async ({ username, password }: { username: string; password: string }, { dispatch }) => {
        const res = await api.post('/login', { username, password });
        const token = res.data.access_token;
        dispatch(authSlice.actions.setTempToken(token));

        const userRes = await api.get('/me');

        dispatch(authSlice.actions.clearTempToken());

        return { ...userRes.data, token } as User;
    }
);

export const logout = createAsyncThunk('auth/logout', async () => {
    await api.post('/logout', null);
});


export const selectAuth = (state: RootState) => state.auth;

export const { clearAuth } = authSlice.actions;
export default authSlice.reducer;
