import type { APIGatewayProxyEventV2WithJWTAuthorizer } from "aws-lambda";
import { markCourseAttendance } from "../../services/teacherService";
import { getRoleFromEvent, forbidden } from "../../shared/rbac";
import { AttendanceEntry } from "../../shared/types";

export const handler = async (event: APIGatewayProxyEventV2WithJWTAuthorizer) => {
  const role = getRoleFromEvent(event);
  if (role !== "teacher") return forbidden();

  const body = JSON.parse(event.body ?? "{}");
  const entries: AttendanceEntry[] = body.entries;

  if (!entries || entries.length === 0) {
    return {
      statusCode: 400,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ error: "entries are required" }),
    };
  }

  try {
    await markCourseAttendance(entries);
    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: "Attendance marked successfully" }),
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