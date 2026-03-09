import type { APIGatewayProxyEventV2WithJWTAuthorizer } from "aws-lambda";
import { getAttendanceForStudent } from "../../services/studentService";
import { getRoleFromEvent, forbidden } from "../../shared/rbac";

export const handler = async (event: APIGatewayProxyEventV2WithJWTAuthorizer) => {
  const role = getRoleFromEvent(event);
  if (role !== "student") return forbidden();

  const studentId = event.pathParameters?.studentId;

  if (!studentId) {
    return {
      statusCode: 400,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ error: "studentId is required" }),
    };
  }

  try {
    const attendance = await getAttendanceForStudent(studentId);
    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(attendance),
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
