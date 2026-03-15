import type { APIGatewayProxyEventV2WithJWTAuthorizer } from "aws-lambda";
import { removeCourseFromDepartmentAdmin, renameDepartmentAdmin } from "../../../services/adminServices";
import { getRoleFromEvent, forbidden } from "../../../shared/rbac";

export const handler = async (event: APIGatewayProxyEventV2WithJWTAuthorizer) => {
  const role = getRoleFromEvent(event);
  if (role !== "admin") return forbidden();

  const routeKey = event.routeKey;

  // PATCH /admin/departments/{departmentId}
  if (routeKey === "PATCH /admin/departments/{departmentId}") {
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
      await renameDepartmentAdmin(departmentId, name);
      return {
        statusCode: 200,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: "Department renamed successfully" }),
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

  // PATCH /admin/departments/{departmentId}/courses/{courseName}
  if (routeKey === "PATCH /admin/departments/{departmentId}/courses/{courseName}") {
    const courseName = event.pathParameters?.courseName;

    if (!courseName) {
      return {
        statusCode: 400,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ error: "courseName is required" }),
      };
    }

    try {
      await removeCourseFromDepartmentAdmin(decodeURIComponent(courseName));
      return {
        statusCode: 200,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: "Course removed from department successfully" }),
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