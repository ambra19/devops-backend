# Cognito
output "user_pool_id" {
  description = "Cognito User Pool ID"
  value       = module.cognito.user_pool_id
}

output "user_pool_client_id" {
  description = "App Client ID — set this as COGNITO_CLIENT_ID in your Lambda env"
  value       = module.cognito.user_pool_client_id
}

output "user_pool_client_secret" {
  description = "App Client secret — set this as COGNITO_CLIENT_SECRET in your Lambda env"
  value       = module.cognito.user_pool_client_secret
  sensitive   = true
}

output "ssm_user_pool_id_path" {
  description = "SSM path — Lambda reads this at runtime"
  value       = module.cognito.ssm_user_pool_id_path
}

output "ssm_client_id_path" {
  description = "SSM path — Lambda reads this at runtime"
  value       = module.cognito.ssm_client_id_path
}

output "secret_client_secret_arn" {
  description = "Secrets Manager ARN — Lambda uses this to fetch the client secret"
  value       = module.cognito.secret_client_secret_arn
  sensitive   = true
}

# DynamoDB
output "attendance_table_arn" {
  value = module.dynamodb.attendance_table_arn
}

output "courses_table_arn" {
  value = module.dynamodb.courses_table_arn
}

output "departments_table_arn" {
  value = module.dynamodb.departments_table_arn
}

output "enrollments_table_arn" {
  value = module.dynamodb.enrollments_table_arn
}

output "users_table_arn" {
  value = module.dynamodb.users_table_arn
}

output "ssm_attendance_table_path" {
  value = module.dynamodb.ssm_attendance_table_path
}

output "ssm_courses_table_path" {
  value = module.dynamodb.ssm_courses_table_path
}

output "ssm_departments_table_path" {
  value = module.dynamodb.ssm_departments_table_path
}

output "ssm_enrollments_table_path" {
  value = module.dynamodb.ssm_enrollments_table_path
}

output "ssm_users_table_path" {
  value = module.dynamodb.ssm_users_table_path
}

# Lambda
output "lambda_function_arns" {
  description = "Map of logical name to function ARN"
  value       = module.lambda.function_arns
}

output "lambda_invoke_arns" {
  description = "Map of logical name to invoke ARN — needed by API Gateway"
  value       = module.lambda.invoke_arns
}

output "lambda_function_names" {
  description = "Map of logical name to actual function name"
  value       = module.lambda.function_names
}

# API Gateway
output "api_endpoint" {
  description = "Base URL for the API — use this to call your Lambda functions"
  value       = module.api_gateway.api_endpoint
}

output "api_id" {
  description = "API Gateway API ID"
  value       = module.api_gateway.api_id
}