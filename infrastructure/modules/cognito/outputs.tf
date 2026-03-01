output "user_pool_id" {
  value = local.user_pool_id
}

output "user_pool_arn" {
  value = tolist(data.aws_cognito_user_pools.this.arns)[0]
}

output "user_pool_client_id" {
  description = "App Client ID — set as COGNITO_CLIENT_ID in Lambda env"
  value       = local.client_id
}

output "user_pool_client_secret" {
  description = "App Client secret — set as COGNITO_CLIENT_SECRET in Lambda env"
  value       = data.aws_cognito_user_pool_client.this.client_secret
  sensitive   = true
}
