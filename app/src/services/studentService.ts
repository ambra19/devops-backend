import { getUserById } from "../data/repositories/users.repository";
import { getCoursesByDepartment } from "../data/repositories/courses.repository";
import { getEnrollmentsByStudent, enrollStudent, unenrollStudent } from "../data/repositories/enrollments.repository";
import { Course } from "../shared/types";
import {getDepartmentById} from "../data/repositories/department.repository";

export async function getStudentDepartment(studentId: string): Promise<string> {
  const user = await getUserById(studentId);
  
  if (!user) {
    throw new Error(`User not found: ${studentId}`);
  }

  const department = await getDepartmentById(user.departmentID);
  return department ?? user.departmentID;
  
}


export async function getStudentName(studentId: string): Promise<string> {
  const user = await getUserById(studentId);
  
  if (!user) {
    throw new Error(`User not found: ${studentId}`);
  }

  return user.name;
}

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