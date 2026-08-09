import type { APIGatewayProxyHandlerV2 } from "aws-lambda";
import { z } from "zod";
import { consumeOAuthState } from "../aws/oauth-state-store";
import { errorMessage } from "../lib/errors";
import { requireEnv } from "../lib/env";
import { logger } from "../lib/logger";
import { loadClientCredentials } from "../schwab/credentials";
import { exchangeAuthorizationCode } from "../schwab/oauth";
import { saveTokenSet } from "../schwab/token-store";

const CallbackQuerySchema = z.object({
  code: z.string().min(1),
  state: z.string().min(1),
});

function htmlResponse(statusCode: number, title: string, message: string) {
  return {
    statusCode,
    headers: {
      "cache-control": "no-store",
      "content-security-policy":
        "default-src 'none'; style-src 'unsafe-inline'",
      "content-type": "text/html; charset=utf-8",
      "x-content-type-options": "nosniff",
    },
    body: `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${title}</title><style>body{font-family:system-ui,sans-serif;max-width:42rem;margin:4rem auto;padding:0 1rem;line-height:1.5}main{border:1px solid #ccc;border-radius:12px;padding:1.5rem}h1{margin-top:0}</style></head><body><main><h1>${title}</h1><p>${message}</p></main></body></html>`,
  };
}

export const handler: APIGatewayProxyHandlerV2 = async (event) => {
  const query = event.queryStringParameters ?? {};

  if (query.error !== undefined) {
    logger.warn("Schwab OAuth authorization was denied", {
      oauthError: query.error,
    });
    return htmlResponse(
      400,
      "Authorization was not completed",
      "Schwab did not authorize the application. You can close this window and start the authorization flow again.",
    );
  }

  const parsed = CallbackQuerySchema.safeParse(query);
  if (!parsed.success) {
    return htmlResponse(
      400,
      "Invalid OAuth callback",
      "The callback did not contain the required authorization code and state.",
    );
  }

  try {
    const tableName = requireEnv("STATE_TABLE_NAME");
    const redirectUri = requireEnv("SCHWAB_REDIRECT_URI");

    // The conditional delete makes the state one-time-use and verifies expiresAt > now.
    await consumeOAuthState(tableName, parsed.data.state);

    const credentials = await loadClientCredentials();
    const tokenSet = await exchangeAuthorizationCode({
      credentials,
      code: parsed.data.code,
      redirectUri,
    });
    await saveTokenSet(tokenSet);

    logger.info("Stored initial Schwab OAuth token set", {
      accessTokenExpiresAt: tokenSet.accessTokenExpiresAt,
    });

    return htmlResponse(
      200,
      "Schwab authorization complete",
      "The portfolio monitor is authorized. You can close this window.",
    );
  } catch (error) {
    logger.error("Schwab OAuth callback failed", {
      error: errorMessage(error),
    });
    return htmlResponse(
      502,
      "Authorization failed",
      "The authorization could not be completed. Start a new authorization flow and try again.",
    );
  }
};
