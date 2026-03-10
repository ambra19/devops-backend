import { docClient } from "../clients/dynamodb.client";
import { GetCommand, ScanCommand } from "@aws-sdk/lib-dynamodb";
import { User } from "../../shared/types";

export async function getUserById(userId: string): Promise<User | undefined> {
  const result = await docClient.send(new GetCommand({
    TableName: "Users",
    Key: { userID: userId },
  }));
  return result.Item as User | undefined;
}

export async function getUserByName(name: string): Promise<User | undefined> {
  const result = await docClient.send(new ScanCommand({
    TableName: "Users",
    FilterExpression: "#n = :name",
    ExpressionAttributeNames: { "#n": "name" },
    ExpressionAttributeValues: { ":name": name },
  }));
  return result.Items?.[0] as User | undefined;
}