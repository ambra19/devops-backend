import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";

const isLocal = process.env.AWS_EXECUTION_ENV === undefined;

const client = new DynamoDBClient({ 
  region: "eu-central-1",
  ...(isLocal && { credentials: require("@aws-sdk/credential-providers").fromIni({ profile: "terraform" }) })
});

export const docClient = DynamoDBDocumentClient.from(client);