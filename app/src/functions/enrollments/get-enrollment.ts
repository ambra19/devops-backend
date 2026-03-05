import { getEnrollmentPageData, getStudentName, getStudentDepartment } from "../../services/studentService";

export const handler = async (event: any) => {
  const studentId = event.pathParameters?.studentId;
  const method = event.requestContext?.http?.method;
  const path = event.rawPath;

  try {
    if (method === "GET" && path === `/students/${studentId}`) {
      const [name, department] = await Promise.all([
        getStudentName(studentId),
        getStudentDepartment(studentId),
      ]);
      return { statusCode: 200, body: JSON.stringify({ name, department}) };
    }

    if (method === "GET" && path === `/students/${studentId}/enrollments`) {
      const data = await getEnrollmentPageData(studentId);
      return { statusCode: 200, body: JSON.stringify(data) };
    }

    return { statusCode: 404, body: JSON.stringify({ error: "Route not found" }) };

  } catch (err: any) {
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
};