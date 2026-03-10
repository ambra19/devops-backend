import type { APIGatewayProxyEventV2WithJWTAuthorizer } from "aws-lambda"
import {
  getUserDepartment,
  getUserName
} from "../../services/userService";
import { getRoleFromEvent, forbidden } from "../../shared/rbac";

export const handler = async (event: APIGatewayProxyEventV2WithJWTAuthorizer) => {
  const role = getRoleFromEvent(event);
  if (!["student", "teacher", "admin"].includes(role)) return forbidden();

  const userId = event.pathParameters?.userId;
  const method = event.requestContext?.http?.method;
  const path = event.rawPath;

  if (!userId) {
    return {
      statusCode: 400,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ error: "userId is required" }),
    };
  }

  try {
    if (method === "GET" && path === `/users/${userId}/name`) {
      const name = await getUserName(userId);
      return {
        statusCode: 200,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      };
    }

    if (method === "GET" && path === `/users/${userId}/department`) {
      const department = await getUserDepartment(userId);
      return {
        statusCode: 200,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ department }),
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