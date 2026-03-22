# devops-backend — Attendance System

Serverless backend for a university attendance registration system built on AWS.

## API Documentation

Interactive API docs (all endpoints, request/response schemas, examples):

**[https://ambra19.github.io/devops-backend/](https://ambra19.github.io/devops-backend/)**

---

## Architecture

**Serverless 3-tier architecture on AWS:**

```
Frontend (S3 + CloudFront)
        ↓
Amazon API Gateway  ←  Cognito JWT authorizer
        ↓
AWS Lambda (per route)
        ↓
Amazon DynamoDB
```

All configuration and secrets are retrieved at runtime from **AWS SSM Parameter Store** — nothing is hardcoded.

---

## AWS Services

| Service | Role |
|---|---|
| **AWS Lambda** | One function per route, written in TypeScript |
| **Amazon API Gateway** (HTTP API) | Routes requests, validates JWT via Cognito authorizer |
| **Amazon DynamoDB** | Five tables: `Users`, `Courses`, `Departments`, `Enrollments`, `Attendance` |
| **Amazon Cognito** | User pool with `Admins`, `Teachers`, `Students` groups — issues JWT tokens |
| **AWS SSM Parameter Store** | Stores Cognito client ID, table names — read at Lambda cold start |
| **S3 + CloudFront** | Frontend hosting (separate repo) |

---

## Lambda Functions

Each Lambda handles one route (or a small set of related routes on the same path).

| Lambda | Routes |
|---|---|
| `attendance-auth-login` | `POST /auth/login` |
| `attendance-auth-change-pass` | `POST /auth/change-password` |
| `get-user` | `GET /users/{userId}/name`, `GET /users/{userId}/department` |
| `get-enrollment` | `GET /students/{studentId}/enrollments` |
| `create-enrollment` | `POST /students/{studentId}/enrollments` |
| `delete-enrollment` | `DELETE /students/{studentId}/enrollments` |
| `get-attendance` | `GET /students/{studentId}/attendance` |
| `create-attendance` | `POST /teachers/attendance` |
| `get-attendance-teacher` | `GET /teachers/{teacherId}/courses`, `GET /teachers/{teacherId}/courses/{courseName}/students` |
| `get-users-page` | `GET /admin/users/students`, `GET /admin/users/teachers` |
| `update-users-page` | `PATCH /admin/users` |
| `get-course` | `GET /admin/courses` |
| `create-course` | `POST /admin/courses` |
| `update-course` | `PATCH /admin/courses` |
| `delete-course` | `DELETE /admin/courses` |
| `get-department` | `GET /admin/departments`, `GET /admin/departments/{departmentId}/courses` |
| `create-department` | `POST /admin/departments`, `POST /admin/departments/{departmentId}/courses` |
| `update-department` | `PATCH /admin/departments/{departmentId}`, `PATCH /admin/departments/{departmentId}/courses/{courseName}` |
| `delete-department` | `DELETE /admin/departments` |
| `get-students-data` | `GET /admin/students/{studentId}/enrollments` |

### Authorization

Role is resolved from the JWT claim `cognito:groups`. Each Lambda calls `getRoleFromEvent()` and returns `403 Forbidden` if the role doesn't match.

| Role | Group in Cognito |
|---|---|
| `admin` | `Admins` |
| `teacher` | `Teachers` |
| `student` | `Students` |

---

## Repository Structure

```
.github/workflows/ci.yml       # CI: runs unit + integration tests on every push and PR to main

app/
  src/
    functions/                 # Lambda handlers, grouped by domain
      admin/
        courses/               # create-course, get-course, update-course, delete-course
        department-page/       # create-department, get-department, update-department, delete-department
        students/              # get-students-data
        users/                 # get-users-page, update-users-page
      attendance/              # get-attendance, create-attendance, get-attendance-teacher
      auth/                    # login, changePass
      enrollments/             # create-enrollment, delete-enrollment, get-enrollment
      users/                   # get-user
    services/                  # Business logic (called by handlers)
      adminServices.ts
      studentService.ts
      teacherService.ts
      userService.ts
    data/
      clients/                 # DynamoDB client singleton
      repositories/            # One file per DynamoDB table
        attendance.repository.ts
        courses.repository.ts
        department.repository.ts
        enrollments.repository.ts
        users.repository.ts
    shared/
      types/                   # TypeScript interfaces (User, Course, Department, Enrollment, Attendance)
      rbac.ts                  # getRoleFromEvent(), forbidden()
      ssm.ts                   # Cached SSM parameter reads
  tests/
    unit/                      # Vitest unit tests (mocked DynamoDB)
    integration/               # HTTP-level integration tests

infrastructure/
  main.tf                      # Terraform root — wires Cognito, DynamoDB, Lambda, API Gateway, CloudFront
  variables.tf
  outputs.tf

bin/
  deploy.sh                    # Build Lambdas → terraform apply → deploy frontend
  backup-data.sh               # Export DynamoDB tables before terraform destroy
  restore-data.sh              # Restore DynamoDB tables and Cognito users after re-deploy

docs/
  index.html                   # GitHub Pages — Swagger UI served from this folder
openapi.yaml                   # OpenAPI 3.0 specification
```

---

## Infrastructure

Provisioned with **Terraform** using private reusable modules:

| Module | Source |
|---|---|
| Cognito | `raluc12/tf-module-cognito` |
| DynamoDB | `raluc12/tf-module-dynamodb` |
| Lambda | `raluc12/tf-module-lambda` |
| API Gateway | `raluc12/tf-module-api-gateway` |
| Frontend | `raluc12/tf-frontend` |

---

## Setup

### Prerequisites

- Node.js >= 18
- AWS CLI configured with a `terraform` profile
- Terraform >= 1.x
- AWS region: `eu-central-1`

### Install

```bash
git clone https://github.com/ambra19/devops-backend.git
cd devops-backend/app && npm install
```

### Deploy

```bash
./bin/deploy.sh
```

This script: compiles TypeScript → zips each Lambda → `terraform apply` → builds and uploads the frontend.

### Destroy

```bash
./bin/deploy.sh --destroy
```

Backs up DynamoDB data automatically before destroying. Restore after re-deploy with:

```bash
./bin/restore-data.sh --dir ./backups/<timestamp> --temp-password "TempPass1!"
```

---

## Testing

```bash
cd app
npm test                          # unit tests
npm run test:integration          # integration tests
npm test -- users.repository.test.ts  # single file
```

Tests use **Vitest** and mock DynamoDB — no real AWS calls during normal test runs. Most Lambda functions were also tested directly via the **AWS Console** using mock event JSON (see the [API docs](https://ambra19.github.io/devops-backend/) for the expected event shape).

### CI

GitHub Actions runs unit and integration tests on every push and every pull request targeting `main`.

---

## Known Limitations

- Student ownership is not enforced on all endpoints — a student can substitute another `studentId` in the URL
- Teacher endpoints do not verify `teacherId` matches the authenticated user
- Several admin operations (rename/delete course, rename user) identify records by **name**, not ID — ambiguous if names are not unique
- `PATCH /admin/departments/{departmentId}/courses/{courseName}` ignores `departmentId` internally and removes the course by name only
- Error responses are not always specific to the failure cause

---

## Authors

Group 6 — DevOps and Cloud-based Software

- Ambra Mihu
- Raluca Chesca
- Karolina Kozieł
- Denisa Martac
