import type { SchwabAccounts } from "../schwab/schemas";

export interface PortfolioSnapshot {
  observedAt: string;
  totalAccountValue: number;
  positionMarketValue: number;
  totalCostBasis: number;
  unrealizedGain: number;
  totalGainPercent: number | null;
}

export function calculatePortfolioSnapshot(
  accounts: SchwabAccounts,
  observedAt = new Date().toISOString(),
): PortfolioSnapshot {
  let totalAccountValue = 0;
  let positionMarketValue = 0;
  let totalCostBasis = 0;

  for (const wrapper of accounts) {
    const account = wrapper.securitiesAccount;
    const liquidationValue = account.currentBalances.liquidationValue;
    if (liquidationValue === undefined) {
      throw new Error(
        "Schwab account response is missing currentBalances.liquidationValue",
      );
    }
    totalAccountValue += liquidationValue;

    for (const position of account.positions) {
      if (position.longQuantity <= 0) {
        continue;
      }
      positionMarketValue += position.marketValue;
      totalCostBasis += position.longQuantity * position.averagePrice;
    }
  }

  const unrealizedGain = positionMarketValue - totalCostBasis;
  const totalGainPercent =
    totalCostBasis > 0 ? (unrealizedGain / totalCostBasis) * 100 : null;

  return {
    observedAt,
    totalAccountValue,
    positionMarketValue,
    totalCostBasis,
    unrealizedGain,
    totalGainPercent,
  };
}
