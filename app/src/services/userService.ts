import {getDepartmentById} from "../data/repositories/department.repository";
import { getUserById } from "../data/repositories/users.repository";

export async function getUserDepartment(userId: string): Promise<string> {
  const user = await getUserById(userId);
  
  if (!user) {
    throw new Error(`User not found: ${userId}`);
  }

  const department = await getDepartmentById(user.departmentID);
  return department ?? user.departmentID;
}

export async function getUserName(userId: string): Promise<string> {
  const user = await getUserById(userId);
  
  if (!user) {
    throw new Error(`User not found: ${userId}`);
  }

  return user.name;
}

export async function getUserDepartmentID(userId: string): Promise<string> {
  const user = await getUserById(userId);
  if (!user) throw new Error(`User not found: ${userId}`);
  return user.departmentID;
}