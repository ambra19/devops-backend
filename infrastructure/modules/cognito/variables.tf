variable "user_pool_name" {
  type        = string
  description = "Name for the Cognito User Pool — match what your teammate used"
}

variable "client_name" {
  type        = string
  description = "Name for the App Client — match what your teammate used"
}

variable "generate_client_secret" {
  type        = bool
  description = "Whether to generate a client secret — must match your teammate's setup (login.js supports both)"
  default     = false
}

variable "tags" {
  type    = map(string)
  default = {}
}
