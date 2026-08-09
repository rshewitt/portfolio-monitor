import { describe, expect, it } from "vitest";
import type { PortfolioState } from "../../src/aws/portfolio-state-store";
import { evaluateAlerts } from "../../src/portfolio/alerts";
import type { PortfolioSnapshot } from "../../src/portfolio/calculate";

function snapshot(value: number, gainPercent: number): PortfolioSnapshot {
  return {
    observedAt: "2026-08-03T12:00:00.000Z",
    totalAccountValue: value,
    positionMarketValue: 115_000,
    totalCostBasis: 100_000,
    unrealizedGain: 15_000,
    totalGainPercent: gainPercent,
  };
}

function state(overrides: Partial<PortfolioState> = {}): PortfolioState {
  return {
    pk: "portfolio#aggregate",
    entityType: "portfolio-state",
    highWaterMark: 150_000,
    currentValue: 150_000,
    lastDrawdownAlertThreshold: 0,
    gainFloorBreached: false,
    totalGainPercent: 50,
    updatedAt: "2026-08-03T11:00:00.000Z",
    ...overrides,
  };
}

describe("evaluateAlerts", () => {
  it("alerts once at the highest crossed drawdown threshold", () => {
    const result = evaluateAlerts({
      snapshot: snapshot(130_000, 30),
      previousState: state(),
      drawdownThresholds: [5, 10, 15, 20],
      gainFloorPercent: 15,
      recoveryBufferPercent: 1,
    });

    expect(result.drawdownPercent).toBeCloseTo(13.333, 3);
    expect(result.alerts).toEqual([
      { type: "drawdown", threshold: 10, actual: result.drawdownPercent },
    ]);
    expect(result.state.lastDrawdownAlertThreshold).toBe(10);
  });

  it("does not repeat the same threshold alert", () => {
    const result = evaluateAlerts({
      snapshot: snapshot(131_000, 31),
      previousState: state({ lastDrawdownAlertThreshold: 10 }),
      drawdownThresholds: [5, 10, 15, 20],
      gainFloorPercent: 15,
      recoveryBufferPercent: 1,
    });

    expect(result.alerts).toEqual([]);
  });

  it("alerts when gain falls below the configured floor", () => {
    const result = evaluateAlerts({
      snapshot: snapshot(145_000, 14.5),
      previousState: state(),
      drawdownThresholds: [5, 10, 15, 20],
      gainFloorPercent: 15,
      recoveryBufferPercent: 1,
    });

    expect(result.alerts).toContainEqual({
      type: "gain-floor",
      floor: 15,
      actual: 14.5,
    });
    expect(result.state.gainFloorBreached).toBe(true);
  });

  it("resets gain-floor state only after recovery buffer", () => {
    const result = evaluateAlerts({
      snapshot: snapshot(150_000, 16),
      previousState: state({ gainFloorBreached: true }),
      drawdownThresholds: [5, 10, 15, 20],
      gainFloorPercent: 15,
      recoveryBufferPercent: 1,
    });

    expect(result.state.gainFloorBreached).toBe(false);
  });
});
