import { unenroll } from "../../services/studentService";

export const handler = async (event: any) => {
  const studentId = event.pathParameters?.studentId;
  const { courseId } = JSON.parse(event.body || "{}");

  try {
    await unenroll(studentId, courseId);
    return { statusCode: 200, body: JSON.stringify({ message: "Unenrolled successfully" }) };
  } catch (err: any) {
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
};