import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

export type AuthStatus =
  | 'checking'
  | 'anonymous'
  | 'validating'
  | 'authenticated';

interface AuthState {
  token: string | null;
  status: AuthStatus;
  error: string | null;
}

const initialState: AuthState = {
  token: null,
  status: 'checking',
  error: null,
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setAnonymous(state, action: PayloadAction<string | undefined>) {
      state.token = null;
      state.status = 'anonymous';
      state.error = action.payload ?? null;
    },
    beginValidation(state, action: PayloadAction<string>) {
      state.token = action.payload;
      state.status = 'validating';
      state.error = null;
    },
    authenticate(state) {
      state.status = 'authenticated';
      state.error = null;
    },
    sessionExpired(state) {
      state.token = null;
      state.status = 'anonymous';
      state.error = 'Your API token is no longer authorized. Enter a replacement token.';
    },
  },
});

export const { authenticate, beginValidation, sessionExpired, setAnonymous } =
  authSlice.actions;
export const authReducer = authSlice.reducer;
