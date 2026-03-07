# ---------------------------------------------------------------------------
# General
# ---------------------------------------------------------------------------

variable "aws_region" {
  type        = string
  description = "AWS region for all resources"
  default     = "eu-central-1"
}

variable "aws_profile" {
  type        = string
  description = "AWS CLI profile to use"
  default     = "terraform"
}

variable "tags" {
  type        = map(string)
  description = "Tags applied to all resources"
  default     = {}
}

# ---------------------------------------------------------------------------
variable "cors_allow_origins" {
  type        = list(string)
  description = "Allowed CORS origins for the API Gateway"
  default     = [
    "http://localhost",
    "http://localhost:5173",
  ]
}

# Cognito
# ---------------------------------------------------------------------------

variable "cognito_user_pool_name" {
  type        = string
  description = "Name for the Cognito User Pool"
}

variable "cognito_app_client_name" {
  type        = string
  description = "Name for the Cognito App Client"
  default     = "attendance-app-client"
}

# ---------------------------------------------------------------------------
# DynamoDB
# ---------------------------------------------------------------------------

variable "table_name_attendance" {
  type        = string
  description = "DynamoDB table name for Attendance"
}

variable "table_name_courses" {
  type        = string
  description = "DynamoDB table name for Courses"
}

variable "table_name_departments" {
  type        = string
  description = "DynamoDB table name for Departments"
}

variable "table_name_enrollments" {
  type        = string
  description = "DynamoDB table name for Enrollments"
}

variable "table_name_users" {
  type        = string
  description = "DynamoDB table name for Users"
}

# ---------------------------------------------------------------------------
# Lambda
# ---------------------------------------------------------------------------

variable "lambda_function_names" {
  type = object({
    auth_login        = string
    auth_change_pass  = string
    create_enrollment = string
    get_enrollment    = string
    delete_enrollment = string
  })
  description = "Names for each Lambda function"
}

variable "lambda_role_names" {
  type = object({
    auth_login        = string
    auth_change_pass  = string
    create_enrollment = string
    get_enrollment    = string
    delete_enrollment = string
  })
  description = "IAM role names for each Lambda function"
}
