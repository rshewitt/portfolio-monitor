import { SchwabHttpError } from "../lib/errors";
import {
  OAuthTokenResponseSchema,
  type OAuthTokenResponse,
  type StoredTokenSet,
} from "./schemas";
import type { SchwabClientCredentials } from "./credentials";

const AUTHORIZATION_ENDPOINT = "https://api.schwabapi.com/v1/oauth/authorize";
const TOKEN_ENDPOINT = "https://api.schwabapi.com/v1/oauth/token";
const REQUEST_TIMEOUT_MS = 15_000;
const ACCESS_TOKEN_SAFETY_WINDOW_SECONDS = 90;

export function buildAuthorizationUrl(input: {
  clientId: string;
  redirectUri: string;
  state: string;
}): string {
  const url = new URL(AUTHORIZATION_ENDPOINT);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("client_id", input.clientId);
  url.searchParams.set("redirect_uri", input.redirectUri);
  url.searchParams.set("state", input.state);
  return url.toString();
}

function basicAuthorization(credentials: SchwabClientCredentials): string {
  return `Basic ${Buffer.from(`${credentials.clientId}:${credentials.clientSecret}`, "utf8").toString("base64")}`;
}

async function tokenRequest(
  credentials: SchwabClientCredentials,
  body: URLSearchParams,
): Promise<OAuthTokenResponse> {
  const response = await fetch(TOKEN_ENDPOINT, {
    method: "POST",
    headers: {
      Accept: "application/json",
      Authorization: basicAuthorization(credentials),
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body,
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });

  if (!response.ok) {
    throw new SchwabHttpError(
      `Schwab token request failed with HTTP ${response.status}`,
      response.status,
    );
  }

  return OAuthTokenResponseSchema.parse(await response.json());
}

function toStoredTokenSet(
  response: OAuthTokenResponse,
  previousRefreshToken?: string,
): StoredTokenSet {
  const obtainedAt = Math.floor(Date.now() / 1000);
  const refreshToken = response.refresh_token ?? previousRefreshToken;
  if (refreshToken === undefined) {
    throw new Error("Schwab token response did not include a refresh token");
  }

  return {
    version: 1,
    accessToken: response.access_token,
    refreshToken,
    tokenType: response.token_type,
    ...(response.scope === undefined ? {} : { scope: response.scope }),
    obtainedAt,
    accessTokenExpiresAt: obtainedAt + response.expires_in,
  };
}

export async function exchangeAuthorizationCode(input: {
  credentials: SchwabClientCredentials;
  code: string;
  redirectUri: string;
}): Promise<StoredTokenSet> {
  const response = await tokenRequest(
    input.credentials,
    new URLSearchParams({
      grant_type: "authorization_code",
      code: input.code,
      redirect_uri: input.redirectUri,
    }),
  );
  return toStoredTokenSet(response);
}

export async function refreshAccessToken(
  credentials: SchwabClientCredentials,
  current: StoredTokenSet,
): Promise<StoredTokenSet> {
  const response = await tokenRequest(
    credentials,
    new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: current.refreshToken,
    }),
  );
  return toStoredTokenSet(response, current.refreshToken);
}

export function accessTokenNeedsRefresh(
  tokenSet: StoredTokenSet,
  nowSeconds?: number,
): boolean {
  const now = nowSeconds ?? Math.floor(Date.now() / 1000);
  return (
    tokenSet.accessTokenExpiresAt - ACCESS_TOKEN_SAFETY_WINDOW_SECONDS <= now
  );
}
