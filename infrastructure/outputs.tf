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