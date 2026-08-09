import type { Handler } from "aws-lambda";
import {
  loadPortfolioState,
  savePortfolioState,
} from "../aws/portfolio-state-store";
import { publishPortfolioAlerts } from "../aws/notifications";
import { SchwabHttpError, errorMessage } from "../lib/errors";
import {
  numberEnv,
  optionalNumberEnv,
  requireEnv,
  thresholdListEnv,
} from "../lib/env";
import { logger } from "../lib/logger";
import { evaluateAlerts } from "../portfolio/alerts";
import { calculatePortfolioSnapshot } from "../portfolio/calculate";
import { getAccounts } from "../schwab/client";
import { loadClientCredentials } from "../schwab/credentials";
import { accessTokenNeedsRefresh, refreshAccessToken } from "../schwab/oauth";
import type { StoredTokenSet } from "../schwab/schemas";
import { loadTokenSet, saveTokenSet } from "../schwab/token-store";

async function refreshAndPersist(
  current: StoredTokenSet,
): Promise<StoredTokenSet> {
  const credentials = await loadClientCredentials();
  const refreshed = await refreshAccessToken(credentials, current);
  await saveTokenSet(refreshed);
  return refreshed;
}

export const handler: Handler<
  Record<string, unknown>,
  Record<string, unknown>
> = async () => {
  const tableName = requireEnv("STATE_TABLE_NAME");
  const topicArn = requireEnv("ALERT_TOPIC_ARN");
  const drawdownThresholds = thresholdListEnv("DRAWDOWN_THRESHOLDS");
  const gainFloorPercent = optionalNumberEnv("GAIN_FLOOR_PERCENT");
  const recoveryBufferPercent = numberEnv("RECOVERY_BUFFER_PERCENT", 1);

  try {
    let tokenSet = await loadTokenSet();
    if (accessTokenNeedsRefresh(tokenSet)) {
      tokenSet = await refreshAndPersist(tokenSet);
    }

    let accounts;
    try {
      accounts = await getAccounts(tokenSet.accessToken);
    } catch (error) {
      if (!(error instanceof SchwabHttpError) || error.status !== 401) {
        throw error;
      }

      // The token may have been revoked or expired earlier than expected. Refresh once and retry.
      tokenSet = await refreshAndPersist(tokenSet);
      accounts = await getAccounts(tokenSet.accessToken);
    }

    const snapshot = calculatePortfolioSnapshot(accounts);
    const previousState = await loadPortfolioState(tableName);
    const evaluation = evaluateAlerts({
      snapshot,
      previousState,
      drawdownThresholds,
      gainFloorPercent,
      recoveryBufferPercent,
    });

    await savePortfolioState(tableName, evaluation.state);
    await publishPortfolioAlerts(
      topicArn,
      evaluation.alerts,
      snapshot,
      evaluation.state.highWaterMark,
    );

    logger.info("Completed portfolio check", {
      totalAccountValue: snapshot.totalAccountValue,
      drawdownPercent: evaluation.drawdownPercent,
      totalGainPercent: snapshot.totalGainPercent,
      alertCount: evaluation.alerts.length,
    });

    return {
      status: "ok",
      observedAt: snapshot.observedAt,
      drawdownPercent: evaluation.drawdownPercent,
      totalGainPercent: snapshot.totalGainPercent,
      alertCount: evaluation.alerts.length,
    };
  } catch (error) {
    logger.error("Portfolio monitor failed", { error: errorMessage(error) });
    throw error;
  }
};
