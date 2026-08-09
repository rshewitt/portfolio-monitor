import { SchwabHttpError } from "../lib/errors";
import { SchwabAccountsSchema, type SchwabAccounts } from "./schemas";

const ACCOUNTS_ENDPOINT =
  "https://api.schwabapi.com/trader/v1/accounts?fields=positions";
const REQUEST_TIMEOUT_MS = 15_000;

export async function getAccounts(
  accessToken: string,
): Promise<SchwabAccounts> {
  const response = await fetch(ACCOUNTS_ENDPOINT, {
    method: "GET",
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });

  if (!response.ok) {
    throw new SchwabHttpError(
      `Schwab accounts request failed with HTTP ${response.status}`,
      response.status,
    );
  }

  return SchwabAccountsSchema.parse(await response.json());
}
