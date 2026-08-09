import { createHash, randomBytes } from "node:crypto";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DeleteCommand,
  DynamoDBDocumentClient,
  PutCommand,
} from "@aws-sdk/lib-dynamodb";
import { hasErrorName } from "../lib/errors";

const documentClient = DynamoDBDocumentClient.from(new DynamoDBClient({}), {
  marshallOptions: { removeUndefinedValues: true },
});

function hashState(state: string): string {
  return createHash("sha256").update(state, "utf8").digest("hex");
}

export interface CreatedOAuthState {
  state: string;
  expiresAt: number;
}

export async function createOAuthState(
  tableName: string,
  lifetimeSeconds = 600,
): Promise<CreatedOAuthState> {
  const state = randomBytes(32).toString("base64url");
  const stateHash = hashState(state);
  const now = Math.floor(Date.now() / 1000);
  const expiresAt = now + lifetimeSeconds;

  await documentClient.send(
    new PutCommand({
      TableName: tableName,
      Item: {
        pk: `oauth-state#${stateHash}`,
        entityType: "oauth-state",
        createdAt: now,
        expiresAt,
      },
      ConditionExpression: "attribute_not_exists(pk)",
    }),
  );

  return { state, expiresAt };
}

export async function consumeOAuthState(
  tableName: string,
  state: string,
): Promise<void> {
  const stateHash = hashState(state);
  const now = Math.floor(Date.now() / 1000);

  try {
    await documentClient.send(
      new DeleteCommand({
        TableName: tableName,
        Key: { pk: `oauth-state#${stateHash}` },
        ConditionExpression: "attribute_exists(pk) AND expiresAt > :now",
        ExpressionAttributeValues: { ":now": now },
        ReturnValues: "ALL_OLD",
      }),
    );
  } catch (error) {
    if (hasErrorName(error, "ConditionalCheckFailedException")) {
      throw new Error("OAuth state is missing, expired, or already used", {
        cause: error,
      });
    }
    throw error;
  }
}
