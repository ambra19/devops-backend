import type { APIGatewayProxyEventV2WithJWTAuthorizer } from "aws-lambda";
import { getAllStudentsAdmin, getAllTeachersAdmin } from "../../../services/adminServices";
import { getRoleFromEvent, forbidden } from "../../../shared/rbac";

export const handler = async (event: APIGatewayProxyEventV2WithJWTAuthorizer) => {
  const role = getRoleFromEvent(event);
  if (role !== "admin") return forbidden();

  const routeKey = event.routeKey;

  if (routeKey === "GET /admin/users/students") {
    try {
      const students = await getAllStudentsAdmin();
      return {
        statusCode: 200,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(students),
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

  if (routeKey === "GET /admin/users/teachers") {
    try {
      const teachers = await getAllTeachersAdmin();
      return {
        statusCode: 200,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(teachers),
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