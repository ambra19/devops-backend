//fetch all courses that belong to a specific department 
//fetching multiple items that share the same ID 

import { docClient } from "../clients/dynamodb.client";
import { ScanCommand, GetCommand } from "@aws-sdk/lib-dynamodb";
import { Course } from "../../shared/types";

export async function getCoursesByDepartment(departmentId: string): Promise<Course[]> {
  const result = await docClient.send(new ScanCommand({
    TableName: "Courses",
    FilterExpression: "departmentID = :did",
    ExpressionAttributeValues: { ":did": departmentId },
  }));
  return (result.Items ?? []) as Course[];
}

export async function getCourseById(courseId: string): Promise<string | undefined> {
  const result = await docClient.send(new GetCommand({
    TableName: "Courses",
    Key: { courseID: courseId },
  }));

  return result.Item?.name as string | undefined;
}

export async function getAllCourses(): Promise<Course[]> {
  const result = await docClient.send(new ScanCommand({
    TableName: "Courses",
  }));
  return (result.Items ?? []) as Course[];
}

export async function getCourseByName(courseName: string): Promise<Course | undefined> {
  const result = await docClient.send(new ScanCommand({
    TableName: "Courses",
    FilterExpression: "#n = :name",
    ExpressionAttributeNames: { "#n": "name" },
    ExpressionAttributeValues: { ":name": courseName },
  }));
  return result.Items?.[0] as Course | undefined;
}