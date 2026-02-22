#!/bin/bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"
BACKEND_DIR="$ROOT_DIR/app"
DIST_DIR="$BACKEND_DIR/dist"
ZIP_PATH="$BACKEND_DIR/lambda.zip"

echo "🔨 Building Terraform..."
cd "$ROOT_DIR/infrastructure"
terraform init
terraform apply --auto-approve #NOT PRODUCTION SAFE
LAMBDA_NAME="$(terraform output -raw lambda_name)"

echo "🔨 Building TypeScript Lambda..."
cd "$BACKEND_DIR"
npm ci # Installs the exact versions of dependencies specified
rm -rf "$DIST_DIR"
npm run build
npm prune --production # Removes all devDependencies from node_modules

echo "📦 Creating zip package..."
rm -f "$ZIP_PATH"
cd "$DIST_DIR"
zip -r "$ZIP_PATH" .

echo "🚀 Deploying Lambda code..."
if aws lambda get-function --function-name "$LAMBDA_NAME" >/dev/null 2>&1; then
  aws lambda update-function-code \
    --function-name "$LAMBDA_NAME" \
    --zip-file "fileb://$ZIP_PATH"
else
  echo "❌ Error: Lambda function '$LAMBDA_NAME' does not exist."
  exit 1
fi

echo "✅ Lambda deployed successfully!"