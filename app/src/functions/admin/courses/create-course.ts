import type { APIGatewayProxyEventV2WithJWTAuthorizer } from "aws-lambda";
import { addCourseToDepartment } from "../../../services/adminServices";
import { getRoleFromEvent, forbidden } from "../../../shared/rbac";

export const handler = async (event: APIGatewayProxyEventV2WithJWTAuthorizer) => {
  const role = getRoleFromEvent(event);
  if (role !== "admin") return forbidden();

  const body = JSON.parse(event.body ?? "{}");
  const { name, departmentId } = body;

  if (!name || !departmentId) {
    return {
      statusCode: 400,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ error: "name and departmentId are required" }),
    };
  }

  try {
    const course = await addCourseToDepartment(name, departmentId);
    return {
      statusCode: 201,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(course),
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