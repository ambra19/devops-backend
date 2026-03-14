import { getCoursesByTeacher, getStudentsByCourse, markCourseAttendance } from "../src/services/teacherService";

// comment for test
async function main() {
  const teacherId = "23543872-1091-7028-0cd9-6f71bb668ebd";
  
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