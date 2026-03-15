//fetch all courses that belong to a specific department 
//fetching multiple items that share the same ID 

import { docClient } from "../clients/dynamodb.client";
import { ScanCommand, GetCommand, PutCommand, DeleteCommand, UpdateCommand} from "@aws-sdk/lib-dynamodb";
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

export async function renameCourse(courseId: string, newName: string): Promise<void> {
  await docClient.send(new UpdateCommand({
    TableName: "Courses",
    Key: { courseID: courseId },
    UpdateExpression: "SET #n = :name",
    ExpressionAttributeNames: { "#n": "name" },
    ExpressionAttributeValues: { ":name": newName },
  }));
}

export async function createCourse(name: string, departmentId: string): Promise<Course> {
  const courseID = `course-${Date.now()}`;
  const course: Course = {
    courseID,
    name,
    departmentID: departmentId,
  };

  await docClient.send(new PutCommand({
    TableName: "Courses",
    Item: course,
  }));

  return course;
}

export async function deleteCourse(courseId: string): Promise<void> {
  await docClient.send(new DeleteCommand({
    TableName: "Courses",
    Key: { courseID: courseId },
  }));
}

export async function removeCourseFromDepartment(courseId: string): Promise<void> {
  await docClient.send(new UpdateCommand({
    TableName: "Courses",
    Key: { courseID: courseId },
    UpdateExpression: "REMOVE departmentID",
  }));
}