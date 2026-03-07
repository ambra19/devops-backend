import type { APIGatewayProxyEventV2WithJWTAuthorizer } from "aws-lambda";
import { unenroll } from "../../services/studentService";
import { getRoleFromEvent, forbidden } from "../../shared/rbac";

export const handler = async (event: APIGatewayProxyEventV2WithJWTAuthorizer) => {
  // only students can unenroll themselves
  const role = getRoleFromEvent(event);
  if (role !== "student") return forbidden();

  const studentId = event.pathParameters?.studentId;
  const body = JSON.parse(event.body ?? "{}");
  const { courseId } = body;

  if (!studentId || !courseId) {
    return {
      statusCode: 400,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ error: "studentId and courseId are required" }),
    };
  }

  try {
    await unenroll(studentId, courseId);
    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: "Unenrolled successfully" }),
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