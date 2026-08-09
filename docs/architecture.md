# Architecture

The application periodically retrieves Schwab account information, evaluates portfolio protection rules, and sends notifications when a configured threshold is crossed.

![Schwab application architecture](diagrams/architecture.svg)

## Components

- **EventBridge Scheduler** invokes the portfolio monitor on a configured schedule.
- **AWS Lambda** runs the TypeScript application and evaluates portfolio rules.
- **AWS Secrets Manager** stores the Schwab application client credentials.
- **DynamoDB** stores OAuth tokens and application state.
- **Schwab Trader API** provides account balances, positions, and token refresh endpoints.
- **Amazon SNS** sends threshold notifications.
- **CloudWatch** stores logs, metrics, and alarms.

## Updating the diagram

Edit `diagrams/architecture.mmd`, then regenerate the SVG:

```bash
npx mmdc \
  --input docs/diagrams/architecture.mmd \
  --output docs/diagrams/architecture.svg
```
