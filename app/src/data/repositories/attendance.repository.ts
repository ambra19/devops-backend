import { docClient } from "../clients/dynamodb.client";
import { GetCommand, PutCommand, QueryCommand } from "@aws-sdk/lib-dynamodb";
import { Attendance } from "../../shared/types";

export async function getAttendanceByStudentAndCourse(
  studentId: string,
  courseId: string
): Promise<Attendance[]> {
  const result = await docClient.send(new QueryCommand({
    TableName: "Attendance",
    KeyConditionExpression: "studentID = :studentId AND begins_with(date_courseID, :coursePrefix)",
    ExpressionAttributeValues: {
      ":studentId": studentId,
      ":coursePrefix": `${courseId}#`,
    },
  }));

  return result.Items as Attendance[];
}

export async function getAttendanceByStudent(studentId: string): Promise<Attendance[]> {
  const result = await docClient.send(new QueryCommand({
    TableName: "Attendance",
    KeyConditionExpression: "studentID = :studentId",
    ExpressionAttributeValues: {
      ":studentId": studentId,
    },
  }));

  return result.Items as Attendance[];
}

export async function markAttendance(
  studentId: string,
  courseId: string,
  date: string,
  presence: boolean
): Promise<void> {
  await docClient.send(new PutCommand({
    TableName: "Attendance",
    Item: {
      studentID: studentId,
      date_courseID: `${date}#${courseId}`,
      presence,
    },
  }));
}
