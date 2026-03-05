variable "aws_region" {
  type    = string
  default = "eu-central-1"
}

variable "aws_profile" {
  type    = string
  default = "terraform"
}

# Cognito
variable "cognito_user_pool_name" {
  type        = string
  description = "Exact name of the existing Cognito User Pool"
}

# DynamoDB
variable "table_name_attendance" {
  type        = string
  description = "Exact name of the Attendance table"
}

variable "table_name_courses" {
  type        = string
  description = "Exact name of the Courses table"
}

variable "table_name_departments" {
  type        = string
  description = "Exact name of the Departments table"
}

variable "table_name_enrollments" {
  type        = string
  description = "Exact name of the Enrollments table"
}

variable "table_name_users" {
  type        = string
  description = "Exact name of the Users table"
}

# Lambda
variable "lambda_function_names" {
  type        = map(string)
  description = "Map of logical name to exact AWS function name"
}

variable "lambda_role_names" {
  type        = map(string)
  description = "Map of logical name to exact IAM execution role name"
}