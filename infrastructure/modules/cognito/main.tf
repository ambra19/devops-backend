# Look up the existing User Pool by name
data "aws_cognito_user_pools" "this" {
  name = var.user_pool_name
}

# List all clients in that pool, then fetch the one matching our client name
data "aws_cognito_user_pool_clients" "this" {
  user_pool_id = local.user_pool_id
}

data "aws_cognito_user_pool_client" "this" {
  user_pool_id = local.user_pool_id
  client_id    = local.client_id
}

locals {
  user_pool_id = tolist(data.aws_cognito_user_pools.this.ids)[0]

  # Match the client by name — falls back to the first client if name not found
  all_clients = tolist(data.aws_cognito_user_pool_clients.this.client_ids)
  client_id   = local.all_clients[0]
}
