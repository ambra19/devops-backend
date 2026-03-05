module "cognito" {
  source = "git::https://github.com/raluc12/tf-module-cognito.git?ref=v1.2.0"

  user_pool_name = var.cognito_user_pool_name
}

module "dynamodb" {
  source = "git::https://github.com/raluc12/tf-module-dynamodb.git?ref=v1.0.0"

  table_name_attendance  = var.table_name_attendance
  table_name_courses     = var.table_name_courses
  table_name_departments = var.table_name_departments
  table_name_enrollments = var.table_name_enrollments
  table_name_users       = var.table_name_users
}

module "lambda" {
  source = "git::https://github.com/raluc12/tf-module-lambda.git?ref=v1.1.0"

  lambda_function_names = var.lambda_function_names
  lambda_role_names     = var.lambda_role_names
}
