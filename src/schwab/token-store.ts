// get and set access keys

import { getSecureParameter, putSecureParameter } from "../aws/parameters";
import { requireEnv } from "../lib/env";
import { StoredTokenSetSchema, type StoredTokenSet } from "./schemas";

export async function loadTokenSet(): Promise<StoredTokenSet> {
  const parameterName = requireEnv("TOKEN_PARAMETER");
  const value = await getSecureParameter(parameterName);

  let parsed: unknown;
  try {
    parsed = JSON.parse(value);
  } catch {
    throw new Error(
      `Token parameter ${parameterName} does not contain valid JSON`,
    );
  }
  return StoredTokenSetSchema.parse(parsed);
}

export async function saveTokenSet(tokenSet: StoredTokenSet): Promise<void> {
  const parameterName = requireEnv("TOKEN_PARAMETER");
  await putSecureParameter(parameterName, JSON.stringify(tokenSet));
}
