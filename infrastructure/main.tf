module "cognito" {
  source = "git::https://github.com/raluc12/tf-module-cognito.git?ref=v1.6.0"

  user_pool_name = var.cognito_user_pool_name
}

module "dynamodb" {
  source = "git::https://github.com/raluc12/tf-module-dynamodb.git?ref=v1.1.0"

  table_name_attendance  = var.table_name_attendance
  table_name_courses     = var.table_name_courses
  table_name_departments = var.table_name_departments
  table_name_enrollments = var.table_name_enrollments
  table_name_users       = var.table_name_users
}

module "lambda" {
  source = "git::https://github.com/raluc12/tf-module-lambda.git?ref=v1.3.0"

  lambda_function_names = var.lambda_function_names
  lambda_role_names     = var.lambda_role_names

   artifacts_dir = "${path.root}/artifacts"
}

module "frontend" {
  source = "git::https://github.com/raluc12/tf-frontend.git?ref=v1.0.0"

  bucket_name       = var.frontend_bucket_name
  distribution_name = var.frontend_distribution_name
  tags              = var.tags
}

module "api_gateway" {
  source = "git::https://github.com/raluc12/tf-module-api-gateway.git?ref=v1.2.0"

  user_pool_id  = module.cognito.user_pool_id
  app_client_id = module.cognito.user_pool_client_id

  lambda_invoke_arns    = module.lambda.invoke_arns
  lambda_function_names = var.lambda_function_names 

  # CloudFront domain is injected directly — no more hardcoded URL in tfvars
  cors_allow_origins = concat(
    ["http://localhost", "http://localhost:5173"],
    [module.frontend.cloudfront_domain]
  )
}