import { describe, expect, it } from "vitest";
import { calculatePortfolioSnapshot } from "../../src/portfolio/calculate";
import type { SchwabAccounts } from "../../src/schwab/schemas";

describe("calculatePortfolioSnapshot", () => {
  it("calculates aggregate account value and long-position unrealized gain", () => {
    const accounts: SchwabAccounts = [
      {
        securitiesAccount: {
          currentBalances: { liquidationValue: 150_000 },
          positions: [
            {
              longQuantity: 100,
              shortQuantity: 0,
              averagePrice: 100,
              marketValue: 12_000,
              instrument: { symbol: "AAA", assetType: "EQUITY" },
            },
            {
              longQuantity: 50,
              shortQuantity: 0,
              averagePrice: 200,
              marketValue: 11_000,
              instrument: { symbol: "BBB", assetType: "EQUITY" },
            },
          ],
        },
      },
    ];

    const result = calculatePortfolioSnapshot(
      accounts,
      "2026-08-03T12:00:00.000Z",
    );

    expect(result.totalAccountValue).toBe(150_000);
    expect(result.positionMarketValue).toBe(23_000);
    expect(result.totalCostBasis).toBe(20_000);
    expect(result.unrealizedGain).toBe(3_000);
    expect(result.totalGainPercent).toBe(15);
  });

  it("throws when liquidation value is unavailable", () => {
    const accounts = [
      {
        securitiesAccount: {
          currentBalances: {},
          positions: [],
        },
      },
    ] as SchwabAccounts;

    expect(() => calculatePortfolioSnapshot(accounts)).toThrow(
      /liquidationValue/,
    );
  });
});
