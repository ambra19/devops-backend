import type { APIGatewayProxyEventV2WithJWTAuthorizer } from "aws-lambda";
import { getAllDepartmentsAdmin, getCoursesByDepartmentAdmin } from "../../../services/adminServices";
import { getRoleFromEvent, forbidden } from "../../../shared/rbac";

export const handler = async (event: APIGatewayProxyEventV2WithJWTAuthorizer) => {
  const role = getRoleFromEvent(event);
  if (role !== "admin") return forbidden();

  const routeKey = event.routeKey;

  // GET /admin/departments
  if (routeKey === "GET /admin/departments") {
    try {
      const departments = await getAllDepartmentsAdmin();
      return {
        statusCode: 200,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(departments),
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

  // GET /admin/departments/{departmentId}/courses
  if (routeKey === "GET /admin/departments/{departmentId}/courses") {
    const departmentId = event.pathParameters?.departmentId;

    if (!departmentId) {
      return {
        statusCode: 400,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ error: "departmentId is required" }),
      };
    }

    try {
      const courses = await getCoursesByDepartmentAdmin(departmentId);
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
  }

  return {
    statusCode: 404,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ error: "Route not found" }),
  };
};