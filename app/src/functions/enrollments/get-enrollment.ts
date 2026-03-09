import type { APIGatewayProxyEventV2WithJWTAuthorizer } from "aws-lambda"
import {
  getEnrollmentPageData
} from "../../services/studentService";
import {
  getUserDepartment,
  getUserName
} from "../../services/userService";
import { getRoleFromEvent, forbidden } from "../../shared/rbac";

export const handler = async (event: APIGatewayProxyEventV2WithJWTAuthorizer) => {
  // only students can view their own enrollment data
  const role = getRoleFromEvent(event);
  if (role !== "student") return forbidden();

  const studentId = event.pathParameters?.studentId;
  const method = event.requestContext?.http?.method;
  const path = event.rawPath;

  if (!studentId) {
    return {
      statusCode: 400,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ error: "studentId is required" }),
    };
  }

  try {
    if (method === "GET" && path === `/students/${studentId}`) {
      const [name, department] = await Promise.all([
        getUserName(studentId),
        getUserDepartment(studentId),
      ]);
      return {
        statusCode: 200,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, department }),
      };
    }

    if (method === "GET" && path === `/students/${studentId}/enrollments`) {
      const data = await getEnrollmentPageData(studentId);
      return {
        statusCode: 200,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      };
    }

    return {
      statusCode: 404,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ error: "Route not found" }),
    };
  } catch (err: unknown) {
    const error = err as { message?: string };
    return {
      statusCode: 500,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ error: error.message ?? "Internal server error" }),
    };
  }
};