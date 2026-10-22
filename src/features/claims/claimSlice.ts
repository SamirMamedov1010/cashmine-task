import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

import type { ClaimAttempt } from './types';

interface ClaimState {
  attempt: ClaimAttempt | null;
  error: string | null;
  scope: string | null;
  status: 'idle' | 'loading' | 'ready' | 'error';
}

const initialState: ClaimState = {
  attempt: null,
  error: null,
  scope: null,
  status: 'idle',
};

const claimSlice = createSlice({
  name: 'claim',
  initialState,
  reducers: {
    beginClaimLoad(state) {
      state.status = 'loading';
      state.error = null;
    },
    setClaimAttempt(
      state,
      action: PayloadAction<{ attempt: ClaimAttempt | null; scope: string }>,
    ) {
      state.attempt = action.payload.attempt;
      state.error = null;
      state.scope = action.payload.scope;
      state.status = 'ready';
    },
    failClaimLoad(state) {
      state.attempt = null;
      state.error =
        'Saved claim recovery data could not be read. New claims are disabled to prevent duplication.';
      state.scope = null;
      state.status = 'error';
    },
    resetClaimState() {
      return initialState;
    },
  },
});

export const { beginClaimLoad, failClaimLoad, resetClaimState, setClaimAttempt } =
  claimSlice.actions;
export const claimReducer = claimSlice.reducer;
