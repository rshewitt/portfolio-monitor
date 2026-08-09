import type { PortfolioState } from "../aws/portfolio-state-store";
import type { PortfolioSnapshot } from "./calculate";

export type AlertEvent =
  | { type: "drawdown"; threshold: number; actual: number }
  | { type: "gain-floor"; floor: number; actual: number };

export interface AlertEvaluation {
  alerts: AlertEvent[];
  drawdownPercent: number;
  state: PortfolioState;
}

function highestCrossedThreshold(
  drawdownPercent: number,
  thresholds: number[],
): number {
  return thresholds.reduce(
    (highest, threshold) =>
      drawdownPercent >= threshold ? threshold : highest,
    0,
  );
}

export function evaluateAlerts(input: {
  snapshot: PortfolioSnapshot;
  previousState: PortfolioState | null;
  drawdownThresholds: number[];
  gainFloorPercent: number | null;
  recoveryBufferPercent: number;
}): AlertEvaluation {
  const { snapshot, previousState } = input;
  const highWaterMark = Math.max(
    previousState?.highWaterMark ?? 0,
    snapshot.totalAccountValue,
  );
  const drawdownPercent =
    highWaterMark > 0
      ? Math.max(
          0,
          ((highWaterMark - snapshot.totalAccountValue) / highWaterMark) * 100,
        )
      : 0;

  const crossedThreshold = highestCrossedThreshold(
    drawdownPercent,
    input.drawdownThresholds,
  );
  const previousThreshold = previousState?.lastDrawdownAlertThreshold ?? 0;
  const alerts: AlertEvent[] = [];
  let nextThreshold = previousThreshold;

  if (crossedThreshold > previousThreshold) {
    alerts.push({
      type: "drawdown",
      threshold: crossedThreshold,
      actual: drawdownPercent,
    });
    nextThreshold = crossedThreshold;
  } else if (
    previousThreshold > 0 &&
    drawdownPercent < previousThreshold - input.recoveryBufferPercent
  ) {
    nextThreshold = crossedThreshold;
  }

  let gainFloorBreached = previousState?.gainFloorBreached ?? false;
  if (input.gainFloorPercent !== null && snapshot.totalGainPercent !== null) {
    if (
      !gainFloorBreached &&
      snapshot.totalGainPercent < input.gainFloorPercent
    ) {
      alerts.push({
        type: "gain-floor",
        floor: input.gainFloorPercent,
        actual: snapshot.totalGainPercent,
      });
      gainFloorBreached = true;
    } else if (
      gainFloorBreached &&
      snapshot.totalGainPercent >=
        input.gainFloorPercent + input.recoveryBufferPercent
    ) {
      gainFloorBreached = false;
    }
  }

  return {
    alerts,
    drawdownPercent,
    state: {
      pk: "portfolio#aggregate",
      entityType: "portfolio-state",
      highWaterMark,
      currentValue: snapshot.totalAccountValue,
      lastDrawdownAlertThreshold: nextThreshold,
      gainFloorBreached,
      totalGainPercent: snapshot.totalGainPercent,
      updatedAt: snapshot.observedAt,
    },
  };
}
