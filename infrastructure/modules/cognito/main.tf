data "aws_cognito_user_pools" "this" {
  name = var.user_pool_name
}

data "aws_cognito_user_pool_clients" "this" {
  user_pool_id = local.user_pool_id
}

data "aws_cognito_user_pool_client" "this" {
  user_pool_id = local.user_pool_id
  client_id    = local.client_id
}

locals {
  user_pool_id = tolist(data.aws_cognito_user_pools.this.ids)[0]
  client_id    = tolist(data.aws_cognito_user_pool_clients.this.client_ids)[0]
}
