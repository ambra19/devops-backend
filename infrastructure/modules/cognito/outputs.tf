output "user_pool_id" {
  description = "Existing Cognito User Pool ID"
  value       = local.user_pool_id
}

output "user_pool_arn" {
  description = "Existing Cognito User Pool ARN — used by API Gateway as the authorizer source"
  value       = data.aws_cognito_user_pools.this.arns[0]
}

output "user_pool_client_id" {
  description = "App Client ID for frontend authentication"
  value       = local.client_id
}

output "user_pool_endpoint" {
  description = "User Pool endpoint (issuer URL for JWT validation)"
  value       = data.aws_cognito_user_pool_client.this.id # endpoint not exposed on client; pool ID is what the JWT issuer URL needs
}
