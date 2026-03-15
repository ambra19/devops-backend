import { getAllCourses, getCoursesByDepartment, createCourse, getCourseByName, deleteCourse, removeCourseFromDepartment, renameCourse } from "../data/repositories/courses.repository";
import { getAllDepartments, createDepartment, renameDepartment, deleteDepartment} from "../data/repositories/department.repository";
import { getAllUsers } from "../data/repositories/users.repository";
import { getUserByName, renameUser } from "../data/repositories/users.repository";
import { Course, Department, User } from "../shared/types";

export async function getAllCoursesAdmin(): Promise<Course[]> {
  return getAllCourses();
}

export async function getAllDepartmentsAdmin(): Promise<Department[]> {
  return getAllDepartments();
}

export async function getAllCoursesWithDepartmentsAdmin(): Promise<Course[]> {
  const [courses, departments] = await Promise.all([
    getAllCourses(),
    getAllDepartments(),
  ]);

  const deptMap = new Map(departments.map((d) => [d.departmentID, d.name]));

  return courses.map((course) => ({
    ...course,
    departmentName: deptMap.get(course.departmentID) ?? course.departmentID,
  }));
}

export async function getCoursesByDepartmentAdmin(departmentId: string): Promise<Course[]> {
  return getCoursesByDepartment(departmentId);
}

export async function getAllStudentsAdmin(): Promise<User[]> {
  const users = await getAllUsers();
  return users.filter((u) => u.role === "student");
}

export async function getAllTeachersAdmin(): Promise<User[]> {
  const users = await getAllUsers();
  return users.filter((u) => u.role === "teacher");
}

export async function addCourseToDepartment(name: string, departmentId: string): Promise<Course> {
  return createCourse(name, departmentId);
}

export async function renameCourseAdmin(courseName: string, newName: string): Promise<void> {
  const course = await getCourseByName(courseName);
  if (!course) throw new Error(`Course not found: ${courseName}`);
  return renameCourse(course.courseID, newName);
}

export async function addDepartment(name: string): Promise<Department> {
  return createDepartment(name);
}

export async function removeCourseFromDepartmentAdmin(courseName: string): Promise<void> {
  const course = await getCourseByName(courseName);
  if (!course) throw new Error(`Course not found: ${courseName}`);
  return removeCourseFromDepartment(course.courseID);
}

export async function deleteCourseAdmin(courseName: string): Promise<void> {
  const course = await getCourseByName(courseName);
  if (!course) throw new Error(`Course not found: ${courseName}`);
  return deleteCourse(course.courseID);
}

export async function renameDepartmentAdmin(departmentId: string, newName: string): Promise<void> {
  return renameDepartment(departmentId, newName);
}

export async function deleteDepartmentAdmin(departmentId: string): Promise<void> {
  return deleteDepartment(departmentId);
}

export async function renameUserAdmin(currentName: string, newName: string): Promise<void> {
  const user = await getUserByName(currentName);
  if (!user) throw new Error(`User not found: ${currentName}`);
  return renameUser(user.userID, newName);
}