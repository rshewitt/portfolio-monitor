import type { Handler } from "aws-lambda";
import { createOAuthState } from "../aws/oauth-state-store";
import { requireEnv } from "../lib/env";
import { logger } from "../lib/logger";
import { loadClientId } from "../schwab/credentials";
import { buildAuthorizationUrl } from "../schwab/oauth";

interface StartAuthResponse {
  authorizationUrl: string;
  expiresAt: string;
  redirectUri: string;
}

export const handler: Handler<
  Record<string, never>,
  StartAuthResponse
> = async () => {
  const tableName = requireEnv("STATE_TABLE_NAME");
  const redirectUri = requireEnv("SCHWAB_REDIRECT_URI");
  const [clientId, oauthState] = await Promise.all([
    loadClientId(),
    createOAuthState(tableName),
  ]);

  logger.info("Created one-time Schwab OAuth authorization URL", {
    expiresAt: oauthState.expiresAt,
  });

  return {
    authorizationUrl: buildAuthorizationUrl({
      clientId,
      redirectUri,
      state: oauthState.state,
    }),
    expiresAt: new Date(oauthState.expiresAt * 1000).toISOString(),
    redirectUri,
  };
};
