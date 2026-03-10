import type { APIGatewayProxyEventV2WithJWTAuthorizer } from "aws-lambda";
import { getCoursesByTeacher, getStudentsByCourse } from "../../services/teacherService";
import { getRoleFromEvent, forbidden } from "../../shared/rbac";

export const handler = async (event: APIGatewayProxyEventV2WithJWTAuthorizer) => {
  const role = getRoleFromEvent(event);
  if (role !== "teacher") return forbidden();

  const routeKey = event.routeKey;

  if (routeKey === "GET /teachers/{teacherId}/courses") {
    const teacherId = event.pathParameters?.teacherId;

    if (!teacherId) {
      return {
        statusCode: 400,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ error: "teacherId is required" }),
      };
    }

    try {
      const courses = await getCoursesByTeacher(teacherId);
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

  if (routeKey === "GET /teachers/{teacherId}/courses/{courseName}/students") {
    const courseName = event.pathParameters?.courseName;

    if (!courseName) {
      return {
        statusCode: 400,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ error: "courseName is required" }),
      };
    }

    try {
      const students = await getStudentsByCourse(decodeURIComponent(courseName));
      return {
        statusCode: 200,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          students.length === 0
            ? { message: "No students enrolled" }
            : students
        ),
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