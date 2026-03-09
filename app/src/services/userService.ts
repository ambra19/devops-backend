import {getDepartmentById} from "../data/repositories/department.repository";
import { getUserById } from "../data/repositories/users.repository";




export async function getUserDepartment(studentId: string): Promise<string> {
  const user = await getUserById(studentId);
  
  if (!user) {
    throw new Error(`User not found: ${studentId}`);
  }

  const department = await getDepartmentById(user.departmentID);
  return department ?? user.departmentID;
  
}


export async function getUserName(studentId: string): Promise<string> {
  const user = await getUserById(studentId);
  
  if (!user) {
    throw new Error(`User not found: ${studentId}`);
  }

  return user.name;
}