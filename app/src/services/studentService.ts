import { getUserById } from "../data/repositories/users.repository";
import { getCoursesByDepartment, getCourseById } from "../data/repositories/courses.repository";
import { getEnrollmentsByStudent, enrollStudent, unenrollStudent } from "../data/repositories/enrollments.repository";
import { Course, Attendance } from "../shared/types";
import { getAttendanceByStudent } from "../data/repositories/attendance.repository";


export async function getEnrollmentPageData(studentId: string) {
  const user = await getUserById(studentId);
  
  if (!user) {
    throw new Error(`User not found: ${studentId}`);
  }

  const [allCourses, enrollments] = await Promise.all([
    getCoursesByDepartment(user.departmentID),
    getEnrollmentsByStudent(studentId),
  ]);

  const enrolledCourseIds = new Set(enrollments.map((e) => e.courseID));

  return {
    enrolledCourses: allCourses.filter((c: Course) => enrolledCourseIds.has(c.courseID)),
    availableCourses: allCourses.filter((c: Course) => !enrolledCourseIds.has(c.courseID)),
  };
}

export async function enroll(studentId: string, courseId: string): Promise<void> {
  await enrollStudent(studentId, courseId);
}

export async function unenroll(studentId: string, courseId: string): Promise<void> {
  await unenrollStudent(studentId, courseId);
}

export async function getAttendanceForStudent(studentId: string): Promise<{ course: string; date: string; presence: boolean }[]> {
  const records = await getAttendanceByStudent(studentId);

  return Promise.all(records.map(async (record: Attendance) => {
    const [courseId, date] = record.date_courseID.split("#");
    const courseName = await getCourseById(courseId);
    return {
      course: courseName ?? courseId,
      date,
      presence: record.presence,
    };
  }));
}