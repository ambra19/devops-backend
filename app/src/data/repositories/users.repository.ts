import { docClient } from "../clients/dynamodb.client";
import { GetCommand } from "@aws-sdk/lib-dynamodb";
import { User } from "../../shared/types";

export async function getUserById(userId: string): Promise<User | undefined> {
  const result = await docClient.send(new GetCommand({
    TableName: "Users",
    Key: { userID: userId },
  }));
  return result.Item as User | undefined;
}