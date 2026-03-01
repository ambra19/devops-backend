export interface User {
  userID: string;
  name: string;
  role: "student" | "teacher" | "admin";
  departmentID: string;
}