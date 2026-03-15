import { getCoursesByTeacher, getStudentsByCourse, markCourseAttendance } from "../src/services/teacherService";

// comment for test
async function main() {
  const teacherId = "f3a408a2-d061-7055-7db7-16a30962cfd7";
  
  // Test 1: get courses
  const courses = await getCoursesByTeacher(teacherId);
  console.log("courses:", JSON.stringify(courses, null, 2));

  // Test 2: get students for a course
  const students = await getStudentsByCourse("Algorithms");
  console.log("students:", JSON.stringify(students, null, 2));

  // Test 3: mark attendance
  await markCourseAttendance([
    { studentName: "Ambra", presence: true, courseName: "Algorithms", date: "2026-03-10" },
    { studentName: "Ambra", presence: false, courseName: "Algorithms", date: "2026-03-11" },
  ]);
  console.log("attendance marked successfully");
}

main().catch(console.error);