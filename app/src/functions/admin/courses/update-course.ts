import type { APIGatewayProxyEventV2WithJWTAuthorizer } from "aws-lambda";
import { renameCourseAdmin } from "../../../services/adminServices";
import { getRoleFromEvent, forbidden } from "../../../shared/rbac";

export const handler = async (event: APIGatewayProxyEventV2WithJWTAuthorizer) => {
  const role = getRoleFromEvent(event);
  if (role !== "admin") return forbidden();

  const body = JSON.parse(event.body ?? "{}");
  const { courseName, newName } = body;

  if (!courseName || !newName) {
    return {
      statusCode: 400,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ error: "courseName and newName are required" }),
    };
  }

  try {
    await renameCourseAdmin(courseName, newName);
    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: "Course renamed successfully" }),
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