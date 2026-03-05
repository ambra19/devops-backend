import { handler as enrollHandler } from "../functions/enrollments/create-enrollment";
import { handler as unenrollHandler } from "../functions/enrollments/delete-enrollment";
import { getEnrollmentsByStudent, unenrollStudent } from "../data/repositories/enrollments.repository";

const TEST_STUDENT_ID = "test-student-123";
const TEST_COURSE_ID = "course-1";

const mockEvent = (body: object) => ({
  pathParameters: { studentId: TEST_STUDENT_ID },
  body: JSON.stringify(body),
});

async function runTests() {
  await unenrollStudent(TEST_STUDENT_ID, TEST_COURSE_ID);
  console.log("DB cleaned:", await getEnrollmentsByStudent(TEST_STUDENT_ID)); // expect []

//   console.log("\n--- Test 1: Enroll with courseId (what frontend sends) ---");
//   const res1 = await enrollHandler(mockEvent({ courseId: TEST_COURSE_ID }));
//   console.log("Status:", res1.statusCode); // expect 200
//   console.log("DB:", await getEnrollmentsByStudent(TEST_STUDENT_ID)); // expect course-1

  console.log("\n--- Test 2: Unenroll with courseId ---");
  const res2 = await unenrollHandler(mockEvent({ courseId: TEST_COURSE_ID }));
  console.log("Status:", res2.statusCode); // expect 200
  console.log("DB:", await getEnrollmentsByStudent(TEST_STUDENT_ID)); // expect []
}

runTests().catch(console.error);