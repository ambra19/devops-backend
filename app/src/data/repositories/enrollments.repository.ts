import { docClient } from "../clients/dynamodb.client";
import { QueryCommand, PutCommand, DeleteCommand } from "@aws-sdk/lib-dynamodb";
import { Enrollment } from "../../shared/types";

export async function getEnrollmentsByStudent(studentId: string): Promise<Enrollment[]> {
  const result = await docClient.send(new QueryCommand({
    TableName: "Enrollments",
    KeyConditionExpression: "studentID = :sid",
    ExpressionAttributeValues: { ":sid": studentId },
  }));
  return (result.Items ?? []) as Enrollment[];
}

export async function enrollStudent(studentId: string, courseId: string): Promise<void> {
  await docClient.send(new PutCommand({
    TableName: "Enrollments",
    Item: { studentID: studentId, courseID: courseId },
  }));
}

export async function unenrollStudent(studentId: string, courseId: string): Promise<void> {
  await docClient.send(new DeleteCommand({
    TableName: "Enrollments",
    Key: { studentID: studentId, courseID: courseId },
  }));
}