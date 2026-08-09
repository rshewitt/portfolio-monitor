import { z } from "zod";

const FiniteNumber = z.number().finite();

export const OAuthTokenResponseSchema = z
  .object({
    access_token: z.string().min(1),
    refresh_token: z.string().min(1).optional(),
    expires_in: z.coerce.number().int().positive(),
    token_type: z.string().min(1),
    scope: z.string().optional(),
    id_token: z.string().optional(),
  })
  .passthrough();

export type OAuthTokenResponse = z.infer<typeof OAuthTokenResponseSchema>;

export const StoredTokenSetSchema = z.object({
  version: z.literal(1),
  accessToken: z.string().min(1),
  refreshToken: z.string().min(1),
  tokenType: z.string().min(1),
  scope: z.string().optional(),
  obtainedAt: z.number().int().positive(),
  accessTokenExpiresAt: z.number().int().positive(),
});

export type StoredTokenSet = z.infer<typeof StoredTokenSetSchema>;

const InstrumentSchema = z
  .object({
    symbol: z.string().optional(),
    assetType: z.string().optional(),
  })
  .passthrough();

export const PositionSchema = z
  .object({
    longQuantity: FiniteNumber.optional().default(0),
    shortQuantity: FiniteNumber.optional().default(0),
    averagePrice: FiniteNumber.optional().default(0),
    marketValue: FiniteNumber.optional().default(0),
    instrument: InstrumentSchema.optional(),
  })
  .passthrough();

const CurrentBalancesSchema = z
  .object({
    liquidationValue: FiniteNumber.optional(),
    cashBalance: FiniteNumber.optional(),
  })
  .passthrough();

export const SecuritiesAccountSchema = z
  .object({
    accountNumber: z.string().optional(),
    currentBalances: CurrentBalancesSchema,
    positions: z.array(PositionSchema).optional().default([]),
  })
  .passthrough();

export const SchwabAccountsSchema = z.array(
  z
    .object({
      securitiesAccount: SecuritiesAccountSchema,
    })
    .passthrough(),
);

export type SchwabAccounts = z.infer<typeof SchwabAccountsSchema>;
