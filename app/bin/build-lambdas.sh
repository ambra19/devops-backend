#!/bin/bash
set -e

FUNCTIONS=(
  "enrollments/create-enrollment"
  "enrollments/delete-enrollment"
  "enrollments/get-enrollment"
  "attendance/get-attendance"
)

for FUNC in "${FUNCTIONS[@]}"; do
  NAME=$(basename $FUNC)
  echo "Building $NAME..."

  npx esbuild src/functions/$FUNC.ts \
    --bundle \
    --platform=node \
    --target=node20 \
    --outfile=dist/$NAME/index.js \
    --external:@aws-sdk/*

  cd dist/$NAME
  zip -r ../../zips/$NAME.zip index.js
  cd ../..

  echo "✓ zips/$NAME.zip"
done