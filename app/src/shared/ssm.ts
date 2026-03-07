/**
 * Shared SSM helper — cached parameter reads for Lambda.
 * Cache persists for the lifetime of the Lambda container,
 * so SSM is only called once per cold start.
 */
import { SSMClient, GetParameterCommand } from "@aws-sdk/client-ssm";

const ssm = new SSMClient({ region: process.env.AWS_REGION });
const cache: Record<string, string> = {};

export async function getParameter(name: string): Promise<string> {
  if (cache[name]) return cache[name];
  const result = await ssm.send(
    new GetParameterCommand({ Name: name, WithDecryption: true })
  );
  const value = result.Parameter?.Value;
  if (!value) throw new Error(`SSM parameter not found: ${name}`);
  cache[name] = value;
  return value;
}