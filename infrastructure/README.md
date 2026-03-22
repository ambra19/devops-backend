# Infrastructure — Attendance App

## Terraform modules

Each module lives in its own GitHub repository and is pinned to a specific version tag.

| Module | Repository | Pinned version | What it creates |
|---|---|---|---|
| `cognito` | [tf-module-cognito](https://github.com/raluc12/tf-module-cognito) | `v1.6.0` | Cognito User Pool, App Client, groups (Admins / Students / Teachers), SSM parameters |
| `dynamodb` | [tf-module-dynamodb](https://github.com/raluc12/tf-module-dynamodb) | `v1.1.0` | DynamoDB tables: Users, Courses, Departments, Enrollments, Attendance; SSM parameters |
| `lambda` | [tf-module-lambda](https://github.com/raluc12/tf-module-lambda) | `v1.3.0` | Lambda functions + IAM roles/policies, CloudWatch log groups, SSM parameters |
| `api_gateway` | [tf-module-api-gateway](https://github.com/raluc12/tf-module-api-gateway) | `v1.2.0` | HTTP API Gateway, Cognito JWT authorizer, routes wired to Lambda, CORS |
| `frontend` | [tf-frontend](https://github.com/raluc12/tf-frontend) | `v1.0.0` | S3 bucket, CloudFront distribution, Origin Access Control |

## Remote state

State is stored in S3 (encrypted):

| Key | Value |
|---|---|
| Bucket | `attendance-app-terraform-bucket` |
| Key | `key/terraform.tfstate` |
| Region | `eu-central-1` |
| AWS profile | `terraform` |

## Prerequisites

The following tools must be installed and available on `$PATH`:

| Tool | Minimum version |
|---|---|
| Terraform | `>= 1.5.0` |
| AWS CLI | v2 |
| Node.js | any LTS |
| npm | bundled with Node |
| zip | any |

AWS credentials must be configured under the `terraform` profile with permissions to manage IAM, Lambda, DynamoDB, Cognito, API Gateway, S3, CloudFront, SSM, and CloudWatch Logs.

## Pipeline commands (`bin/`)

### Deploy (normal flow)

```bash
./bin/deploy.sh
```

Runs the full pipeline in order:
1. Builds Lambda zip artifacts from `app/`
2. Runs `terraform init`, `validate`, and `apply`
3. Builds the frontend, uploads it to S3, and invalidates the CloudFront cache

### Build Lambda artifacts only

```bash
./bin/deploy.sh --build-only
```

Compiles TypeScript and packages zip files into `infrastructure/artifacts/` without touching Terraform or the frontend. Useful for verifying builds in CI.

### Destroy all infrastructure

```bash
./bin/deploy.sh --destroy
```

Automatically runs `backup-data.sh` first, then destroys all Terraform-managed resources. A 5-second countdown is shown before destruction begins.

> **Warning:** This deletes all AWS resources. DynamoDB data is backed up automatically, but Cognito passwords cannot be exported and will need to be reset after restore.

### Backup DynamoDB + Cognito data

```bash
./bin/backup-data.sh
# or to a specific directory:
./bin/backup-data.sh --dir ./backups/my-snapshot
```

Exports all DynamoDB table items and Cognito user/group data to JSON files in `backups/<timestamp>/`.
> **Note:** Cognito passwords cannot be exported by the AWS API and are not included in the backup.

### Restore data after apply

```bash
./bin/restore-data.sh --dir ./backups/<timestamp> --temp-password <temp-pass>
```

After a fresh `terraform apply`, restores DynamoDB items and Cognito users from a backup. Also remaps Cognito `sub` UUIDs (which change on every destroy+apply) in the Users, Enrollments, and Attendance tables.

Users will need to change their password on first login using the supplied `--temp-password`.

### Import manually-created resources (one-time)

```bash
./bin/import-existing.sh
```

One-time script for bootstrapping Terraform state when resources were created outside Terraform. Imports DynamoDB tables, Cognito resources, Lambda functions + IAM roles, API Gateway, and the frontend S3/CloudFront stack. Only needed when taking over existing manually-created infrastructure.

## Typical workflows

**Regular deployment (destroy and apply)**
```bash
./bin/deploy.sh --destroy
./bin/deploy.sh
```

**Deployment to preserve data if there was manually created infrastracture**
```bash
./bin/import-existing.sh
./bin/deploy.sh --destroy
./bin/deploy.sh
./bin/restore-data.sh --dir ./backups/<timestamp> --temp-password <temp-pass>
```