import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, GetCommand, PutCommand } from "@aws-sdk/lib-dynamodb";
import { z } from "zod";

const documentClient = DynamoDBDocumentClient.from(new DynamoDBClient({}), {
  marshallOptions: { removeUndefinedValues: true },
});

const PortfolioStateSchema = z.object({
  pk: z.literal("portfolio#aggregate"),
  entityType: z.literal("portfolio-state"),
  highWaterMark: z.number().nonnegative(),
  currentValue: z.number().nonnegative(),
  lastDrawdownAlertThreshold: z.number().nonnegative(),
  gainFloorBreached: z.boolean(),
  totalGainPercent: z.number().nullable(),
  updatedAt: z.string(),
});

export type PortfolioState = z.infer<typeof PortfolioStateSchema>;

export async function loadPortfolioState(tableName: string): Promise<PortfolioState | null> {
  const response = await documentClient.send(
    new GetCommand({
      TableName: tableName,
      Key: { pk: "portfolio#aggregate" },
      ConsistentRead: true,
    }),
  );

  if (response.Item === undefined) {
    return null;
  }
  return PortfolioStateSchema.parse(response.Item);
}

export async function savePortfolioState(
  tableName: string,
  state: PortfolioState,
): Promise<void> {
  await documentClient.send(
    new PutCommand({
      TableName: tableName,
      Item: state,
    }),
  );
}
