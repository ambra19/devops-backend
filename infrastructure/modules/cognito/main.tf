###############################################################################
# MODULE: cognito
#
# Creates the Cognito User Pool and App Client via Terraform.
# Settings are based on login.js requirements:
#   - USER_PASSWORD_AUTH flow (required by InitiateAuthCommand)
#   - Email as username
#   - Optional SECRET_HASH (controlled by var.generate_client_secret)
###############################################################################

resource "aws_cognito_user_pool" "this" {
  name = var.user_pool_name

  # login.js uses email as USERNAME in AuthParameters
  username_attributes      = ["email"]
  auto_verified_attributes = ["email"]

  password_policy {
    minimum_length                   = 8
    require_lowercase                = true
    require_uppercase                = true
    require_numbers                  = true
    require_symbols                  = false
    temporary_password_validity_days = 7
  }

  tags = var.tags
}

resource "aws_cognito_user_pool_client" "this" {
  name         = var.client_name
  user_pool_id = aws_cognito_user_pool.this.id

  # USER_PASSWORD_AUTH is what login.js passes as AuthFlow
  explicit_auth_flows = [
    "ALLOW_USER_PASSWORD_AUTH",
    "ALLOW_USER_SRP_AUTH",
    "ALLOW_REFRESH_TOKEN_AUTH",
  ]

  # Set to true only if your teammate had a client secret enabled
  # login.js handles both cases — getSecretHash() returns undefined if no secret
  generate_secret = var.generate_client_secret

  access_token_validity  = 1
  id_token_validity      = 1
  refresh_token_validity = 30

  token_validity_units {
    access_token  = "hours"
    id_token      = "hours"
    refresh_token = "days"
  }
}

# ─── RBAC Groups ─────────────────────────────────────────────────────────────
resource "aws_cognito_user_group" "admin" {
  name         = "admin"
  user_pool_id = aws_cognito_user_pool.this.id
  description  = "Full access"
  precedence   = 1
}

resource "aws_cognito_user_group" "teacher" {
  name         = "teacher"
  user_pool_id = aws_cognito_user_pool.this.id
  description  = "Manage courses and attendance"
  precedence   = 2
}

resource "aws_cognito_user_group" "student" {
  name         = "student"
  user_pool_id = aws_cognito_user_pool.this.id
  description  = "View own attendance"
  precedence   = 3
}
