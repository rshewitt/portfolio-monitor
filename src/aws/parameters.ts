import {
  GetParameterCommand,
  PutParameterCommand,
  SSMClient,
} from "@aws-sdk/client-ssm";
import { hasErrorName } from "../lib/errors";

const ssm = new SSMClient({});

export async function getSecureParameter(name: string): Promise<string> {
  try {
    const response = await ssm.send(
      new GetParameterCommand({
        Name: name,
        WithDecryption: true,
      }),
    );

    const value = response.Parameter?.Value;
    if (value === undefined || value === "") {
      throw new Error(`SSM parameter ${name} has no value`);
    }
    return value;
  } catch (error) {
    if (hasErrorName(error, "ParameterNotFound")) {
      throw new Error(`SSM parameter ${name} does not exist`, { cause: error });
    }
    throw error;
  }
}

export async function putSecureParameter(
  name: string,
  value: string,
): Promise<void> {
  await ssm.send(
    new PutParameterCommand({
      Name: name,
      Value: value,
      Type: "SecureString",
      Overwrite: true,
    }),
  );
}
