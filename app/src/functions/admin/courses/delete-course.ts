import type { APIGatewayProxyEventV2WithJWTAuthorizer } from "aws-lambda";
import { deleteCourseAdmin } from "../../../services/adminServices";
import { getRoleFromEvent, forbidden } from "../../../shared/rbac";

export const handler = async (event: APIGatewayProxyEventV2WithJWTAuthorizer) => {
  const role = getRoleFromEvent(event);
  if (role !== "admin") return forbidden();

  const body = JSON.parse(event.body ?? "{}");
  const { courseName } = body;

  if (!courseName) {
    return {
      statusCode: 400,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ error: "courseName is required" }),
    };
  }

  try {
    await deleteCourseAdmin(courseName);
    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: "Course deleted successfully" }),
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