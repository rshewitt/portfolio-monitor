import { PublishCommand, SNSClient } from "@aws-sdk/client-sns";
import type { AlertEvent } from "../portfolio/alerts";
import type { PortfolioSnapshot } from "../portfolio/calculate";

const sns = new SNSClient({});

function money(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(value);
}

function percent(value: number | null): string {
  return value === null ? "Unavailable" : `${value.toFixed(2)}%`;
}

export async function publishPortfolioAlerts(
  topicArn: string,
  alerts: AlertEvent[],
  snapshot: PortfolioSnapshot,
  highWaterMark: number,
): Promise<void> {
  if (alerts.length === 0) {
    return;
  }

  const alertLines = alerts.map((alert) => {
    if (alert.type === "drawdown") {
      return `- Drawdown crossed ${alert.threshold.toFixed(1)}% (current: ${alert.actual.toFixed(2)}%).`;
    }
    return `- Unrealized gain fell below ${alert.floor.toFixed(1)}% (current: ${alert.actual.toFixed(2)}%).`;
  });

  const message = [
    "Schwab portfolio guard alert",
    "",
    ...alertLines,
    "",
    `Current account value: ${money(snapshot.totalAccountValue)}`,
    `Recorded high-water mark: ${money(highWaterMark)}`,
    `Unrealized gain: ${money(snapshot.unrealizedGain)}`,
    `Unrealized gain percentage: ${percent(snapshot.totalGainPercent)}`,
    `Checked at: ${snapshot.observedAt}`,
    "",
    "This application is alert-only and did not place any trades.",
  ].join("\n");

  await sns.send(
    new PublishCommand({
      TopicArn: topicArn,
      Subject: "Schwab portfolio guard threshold crossed",
      Message: message,
    }),
  );
}
