#!/bin/bash
set -e

FUNCTIONS=(
  "enrollments/create-enrollment"
  "enrollments/delete-enrollment"
  "enrollments/get-enrollment"
  "attendance/get-attendance"
  "users/get-user"
  "attendance/get-attendance-teacher"
  "attendance/create-attendance"
  "admin/department-page/create-department"
  "admin/department-page/delete-department"
  "admin/department-page/get-department"
  "admin/department-page/update-department"
  "admin/courses/create-course"
  "admin/courses/delete-course"
  "admin/courses/get-course"
  "admin/courses/update-course"
  "admin/users/get-users-page"
  "admin/users/update-users-page"
  "admin/students/get-students-data"
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