import type { APIGatewayProxyEventV2WithJWTAuthorizer } from "aws-lambda";
import { addCourseToDepartment, addDepartment } from "../../../services/adminServices";
import { getRoleFromEvent, forbidden } from "../../../shared/rbac";

export const handler = async (event: APIGatewayProxyEventV2WithJWTAuthorizer) => {
  const role = getRoleFromEvent(event);
  if (role !== "admin") return forbidden();

  const routeKey = event.routeKey;

  // POST /admin/departments
  if (routeKey === "POST /admin/departments") {
    const body = JSON.parse(event.body ?? "{}");
    const { name } = body;

    if (!name) {
      return {
        statusCode: 400,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ error: "name is required" }),
      };
    }

    try {
      const department = await addDepartment(name);
      return {
        statusCode: 201,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(department),
      };
    } catch (err: unknown) {
      const error = err as { message?: string };
      return {
        statusCode: 500,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ error: error.message ?? "Internal server error" }),
      };
    }
  }

  // POST /admin/departments/{departmentId}/courses
  if (routeKey === "POST /admin/departments/{departmentId}/courses") {
    const departmentId = event.pathParameters?.departmentId;
    const body = JSON.parse(event.body ?? "{}");
    const { name } = body;

    if (!departmentId || !name) {
      return {
        statusCode: 400,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ error: "departmentId and name are required" }),
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
  }

  return {
    statusCode: 404,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ error: "Route not found" }),
  };
};