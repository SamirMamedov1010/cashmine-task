
import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';

import type { RootState } from '../store';
import type {
  BalancesResponse,
  ClaimOptionsResponse,
  ClaimStatusResponse,
  CreateClaimRequest,
  CreateClaimResponse,
} from '../types/api';

interface CreateClaimArgs {
  body: CreateClaimRequest;
  idempotencyKey: string;
}

export const api = createApi({
  reducerPath: 'api',
  tagTypes: ['Balances'],
  baseQuery: fetchBaseQuery({
    baseUrl: 'https://task-api.cashmine.io',
    prepareHeaders: (headers, { getState }) => {
      const token = (getState() as RootState).auth.token;

      if (token) {
        headers.set('authorization', `Bearer ${token}`);
      }

      headers.set('accept', 'application/json');
      return headers;
    },
  }),
  endpoints: (builder) => ({
    getBalances: builder.query<BalancesResponse, void>({
      query: () => '/v1/balances',
      providesTags: ['Balances'],
    }),
    getClaimOptions: builder.query<ClaimOptionsResponse, string>({
      query: (asset) => ({
        url: '/v1/claim-options',
        params: { asset },
      }),
    }),
    createClaim: builder.mutation<CreateClaimResponse, CreateClaimArgs>({
      query: ({ body, idempotencyKey }) => ({
        url: '/v1/claims',
        method: 'POST',
        headers: { 'Idempotency-Key': idempotencyKey },
        body,
      }),
    }),
    getClaim: builder.query<ClaimStatusResponse, string>({
      query: (id) => `/v1/claims/${encodeURIComponent(id)}`,
    }),
  }),
});

export const {
  useCreateClaimMutation,
  useGetBalancesQuery,
  useGetClaimOptionsQuery,
  useLazyGetClaimQuery,
} = api;
