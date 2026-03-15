import type { APIGatewayProxyEventV2WithJWTAuthorizer } from "aws-lambda";
import { getAllCoursesWithDepartmentsAdmin } from "../../../services/adminServices";
import { getRoleFromEvent, forbidden } from "../../../shared/rbac";

export const handler = async (event: APIGatewayProxyEventV2WithJWTAuthorizer) => {
  const role = getRoleFromEvent(event);
  if (role !== "admin") return forbidden();

  try {
    const courses = await getAllCoursesWithDepartmentsAdmin();
    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(courses),
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