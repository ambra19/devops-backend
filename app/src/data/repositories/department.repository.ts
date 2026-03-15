import { Department } from "shared/types";
import { docClient } from "../clients/dynamodb.client";
import { GetCommand, ScanCommand, PutCommand, DeleteCommand, UpdateCommand} from "@aws-sdk/lib-dynamodb";

export async function getDepartmentById(departmentId: string): Promise<string | undefined> {
  const result = await docClient.send(new GetCommand({
    TableName: "Departments",
    Key: { departmentID: departmentId },
  }));
  return result.Item?.name as string | undefined;
}

export async function getAllDepartments(): Promise<Department[]> {
  const result = await docClient.send(new ScanCommand({
    TableName: "Departments",
  }));
  return (result.Items ?? []) as Department[];
}


export async function createDepartment(name: string): Promise<Department> {
  const departmentID = `dept-${Date.now()}`;
  const department: Department = {
    departmentID,
    name,
  };

  await docClient.send(new PutCommand({
    TableName: "Departments",
    Item: department,
  }));

  return department;
}

export async function deleteDepartment(departmentId: string): Promise<void> {
  await docClient.send(new DeleteCommand({
    TableName: "Departments",
    Key: { departmentID: departmentId },
  }));
}

export async function renameDepartment(departmentId: string, newName: string): Promise<void> {
  await docClient.send(new UpdateCommand({
    TableName: "Departments",
    Key: { departmentID: departmentId },
    UpdateExpression: "SET #n = :name",
    ExpressionAttributeNames: { "#n": "name" },
    ExpressionAttributeValues: { ":name": newName },
  }));
}