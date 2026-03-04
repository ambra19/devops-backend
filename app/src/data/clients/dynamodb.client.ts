import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";
import { fromIni } from "@aws-sdk/credential-providers";

const client = new DynamoDBClient({ 
  region: "eu-central-1",
  credentials: fromIni({ profile: "terraform" })
});

export const docClient = DynamoDBDocumentClient.from(client);