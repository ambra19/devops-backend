import { getCoursesByDepartment, getCourseByName } from "../data/repositories/courses.repository";
import { getUserDepartment, getUserName, getUserDepartmentID } from "./userService";
import { getUserByName } from "../data/repositories/users.repository";
import { Course, AttendanceEntry } from "../shared/types";
import { getEnrollmentsByCourse } from "../data/repositories/enrollments.repository";
import { markAttendance } from "../data/repositories/attendance.repository";

export async function getCoursesByTeacher(teacherId: string): Promise<string[]> {
  const departmentId = await getUserDepartmentID(teacherId);
  const courses = await getCoursesByDepartment(departmentId);
  return courses.map((c) => c.name);
}

export async function getStudentsByCourse(courseName: string): Promise<{ name: string; department: string }[]> {
  const course = await getCourseByName(courseName);

  if (!course) {
    throw new Error(`Course not found: ${courseName}`);
  }

  const enrollments = await getEnrollmentsByCourse(course.courseID);

  if (enrollments.length === 0) {
    return [];
  }

  return Promise.all(
    enrollments.map(async (e) => {
      const [name, department] = await Promise.all([
        getUserName(e.studentID),
        getUserDepartment(e.studentID),
      ]);
      return { name, department };
    })
  );
}

export async function markCourseAttendance(entries: AttendanceEntry[]): Promise<void> {
  await Promise.all(
    entries.map(async (e) => {
      const course = await getCourseByName(e.courseName);
      if (!course) throw new Error(`Course not found: ${e.courseName}`);

      const user = await getUserByName(e.studentName);
      if (!user) throw new Error(`Student not found: ${e.studentName}`);

      return markAttendance(user.userID, course.courseID, e.date, e.presence);
    })
  );
}