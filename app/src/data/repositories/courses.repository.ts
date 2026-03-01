//fetch all courses that belong to a specific department 
//fetching multiple items that share the same ID 

import { docClient } from "../clients/dynamodb.client";
import { ScanCommand } from "@aws-sdk/lib-dynamodb";
import { Course } from "../../shared/types";

export async function getCoursesByDepartment(departmentId: string): Promise<Course[]> {
  const result = await docClient.send(new ScanCommand({
    TableName: "Courses",
    FilterExpression: "departmentID = :did",
    ExpressionAttributeValues: { ":did": departmentId },
  }));
  return (result.Items ?? []) as Course[];
}