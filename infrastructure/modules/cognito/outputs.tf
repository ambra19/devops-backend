output "user_pool_id" {
  description = "Cognito User Pool ID"
  value       = aws_cognito_user_pool.this.id
}

output "user_pool_arn" {
  description = "Cognito User Pool ARN — needed later for API Gateway JWT authorizer"
  value       = aws_cognito_user_pool.this.arn
}

output "user_pool_client_id" {
  description = "App Client ID — set as COGNITO_CLIENT_ID in Lambda env"
  value       = aws_cognito_user_pool_client.this.id
}

output "user_pool_client_secret" {
  description = "App Client secret — set as COGNITO_CLIENT_SECRET in Lambda env (empty string if generate_client_secret is false)"
  value       = aws_cognito_user_pool_client.this.client_secret
  sensitive   = true
}
