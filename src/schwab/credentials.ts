// get client credentials

import { getSecureParameter } from "../aws/parameters";
import { requireEnv } from "../lib/env";

export interface SchwabClientCredentials {
  clientId: string;
  clientSecret: string;
}

export async function loadClientId(): Promise<string> {
  return getSecureParameter(requireEnv("CLIENT_ID_PARAMETER"));
}

export async function loadClientCredentials(): Promise<SchwabClientCredentials> {
  const [clientId, clientSecret] = await Promise.all([
    getSecureParameter(requireEnv("CLIENT_ID_PARAMETER")),
    getSecureParameter(requireEnv("CLIENT_SECRET_PARAMETER")),
  ]);
  return { clientId, clientSecret };
}
