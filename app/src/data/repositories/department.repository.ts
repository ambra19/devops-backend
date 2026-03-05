import { docClient } from "../clients/dynamodb.client";
import { GetCommand } from "@aws-sdk/lib-dynamodb";

export async function getDepartmentById(departmentId: string): Promise<string | undefined> {
  const result = await docClient.send(new GetCommand({
    TableName: "Departments",
    Key: { departmentID: departmentId },
  }));
  return result.Item?.name as string | undefined;
}