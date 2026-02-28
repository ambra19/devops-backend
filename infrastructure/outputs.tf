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