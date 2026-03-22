# Backend — Attendance System Application

## Overview

This repository contains the serverless backend of a cloud-based university attendance registration system.

The system supports three primary user roles:
- **Students** — enroll in courses and view attendance
- **Teachers** — manage and mark attendance
- **Administrators** — manage users, courses, and departments

The backend is built using a **serverless architecture on AWS** and uses:
- **AWS Lambda** for compute
- **Amazon API Gateway** for routing
- **Amazon DynamoDB** for storage
- **Amazon Cognito** for authentication
- **Node.js / TypeScript** for implementation


## Architecture Overview

The backend follows a **serverless 3-tier architecture**:

- **Presentation Layer** → Frontend (separate repository, hosted via S3 + CloudFront)
- **Logic Layer** → API Gateway + AWS Lambda
- **Data Layer** → Amazon DynamoDB

### Request Flow

1. A user authenticates through **Amazon Cognito**
2. The frontend sends a request to **API Gateway**
3. API Gateway validates the JWT and forwards the request to the appropriate **Lambda**
4. The Lambda:
   - resolves the user role
   - verifies permissions
   - runs the required business logic
5. The backend returns a JSON response to the frontend

### Authorization

- **Authorizer name:** `cognito-jwt`
- **Authorizer type:** `JWT`


##  Key Design Decisions

- **Serverless over containers** to reduce maintenance overhead and handle traffic spikes automatically
- **Micro-Lambda structure** to keep functions smaller and independent
- **Layered design**:
  - Handlers → Services → Repositories
- **DynamoDB** to automatically scale and handle many requests at the same time, unlike relational databases which have a fixed number of connections.
- **Cognito** for managed authentication and assigning roles to control what they can access
- **SSM Parameter Store** for secrets and configuration retrieval
- **GitHub Actions CI** for checking the code by running unit and integration tests every time changes are made

---

## Repository Structure

The backend repository is organized to keep Lambda handlers, business logic, data access, shared utilities, and tests separated and focused on their own scope

```text
.github/
  workflows/
    ci.yml                 # Continuous Integration workflow

app/
  src/
    data/
      clients/             # DynamoDB client setup
      repositories/        # DynamoDB table access modules
        attendance.repository.ts
        courses.repository.ts
        department.repository.ts
        enrollments.repository.ts
        users.repository.ts

    functions/             # AWS Lambda handlers grouped by domain
      admin/
      attendance/
      auth/
      enrollments/
      users/

    services/              # Business logic layer
      adminServices.ts
      studentService.ts
      teacherService.ts
      userService.ts

    shared/                # Shared utilities
      types/
        attendance.ts      # Database model
        attendanceEntry.ts # DTO used for frontend input
        course.ts
        department.ts
        enrollment.ts
      rbac.ts              # Role-based access control helpers
      ssm.ts               # Cached SSM parameter retrieval

tests/
  integration/             # Integration tests
  unit/                    # Unit tests
```

### Notes 

- `.github/workflows/ci.yml`  
  Runs automated unit and integration tests on:
  - every push to any branch
  - every pull request targeting `main`

- `app/src/shared/ssm.ts`  
  Retrieves configuration values and secrets from AWS Systems Manager (SSM) Parameter Store and caches them in memory to avoid repeated calls.

---

## Setup & Installation

### Prerequisites

- Node.js >= 18
- AWS CLI configured
- AWS region: `eu-central-1`
- AWS account with Lambda and DynamoDB access

### Installation

```bash
git clone https://github.com/ambra19/devops-backend.git

# Install app dependencies
cd app
npm install

# Install infrastructure dependencies
cd ../infrastructure
npm install
```

### Deploy infrastructure

```bash
cd infrastructure
cdk bootstrap
cdk deploy
```

### Run locally

```bash
# Run the app
cd app
npm run dev

# Run unit tests
npm run test

# Run integration tests
npm run test:integration
```

---

## Authentication & Authorization

Authentication is handled through **Amazon Cognito** using JWT tokens.

Authorization is enforced in the backend through **role-based access control (RBAC)**.

Supported roles:
- `student`
- `teacher`
- `admin`

---

## API Documentation

### Base URL

```text
https://cnhsjzcr65.execute-api.eu-central-1.amazonaws.com
```

---

## General User (Users)

### GET /users/{userId}/department
**Lambda:** `get-user`

**Description**  
Returns the department of a user.

**Authorization**
- Allowed roles: `student`, `teacher`, `admin`

**Path Parameters**
- `userId` — unique ID(sub) of the user 

**Request Body**  
None

**Successful Response (`200 OK`)**
```json
{
  "department": "Computer Science"
}
```

**Implementation Note**  
If the department is not found, the backend returns the department ID instead of the department name.


### GET /users/{userId}/name
**Lambda:** `get-user`

**Description**  
Returns the name of a user.

**Authorization**
- Allowed roles: `student`, `teacher`, `admin`

**Path Parameters**
- `userId` — unique ID(sub) of the user

**Request Body**  
None.

**Successful Response (`200 OK`)**
```json
{
  "name": "Raluuuu"
}
```


## Students

### GET /students/{studentId}/enrollments
**Lambda:** `get-enrollment`

**Description**  
Returns the enrolled and available courses for the authenticated student.

**Authorization**
- Allowed role: `student`

**Path Parameters**
- `studentId` — unique ID(sub) of the student

**Request Body**  
None

**Successful Response (`200 OK`)**
```json
{
  "enrolledCourses": [
    {
      "courseID": "course-1",
      "courseName": "Algorithms",
      "departmentID": "dept-1"
    },
    {
      "courseID": "course-4",
      "courseName": "Computer Networks",
      "departmentID": "dept-1"
    },
    {
      "courseID": "course-1773574137813",
      "courseName": "Databases",
      "departmentID": "dept-1"
    }
  ],
  "availableCourses": [
    {
      "courseID": "course-3",
      "courseName": "Machine Learning",
      "departmentID": "dept-1"
    }
  ]
}
```


### POST /students/{studentId}/enrollments
**Lambda:** `create-enrollment`

**Description**  
Creates a new enrollment for a student in a specific course.

**Authorization**
- Allowed roles: `student`, `admin`

**Path Parameters**
- `studentId` — unique ID(sub) of the student

**Request Body**
```json
{
  "courseId": "course-4"
}
```

**Successful Response (`200 OK`)**
```json
{
  "message": "Enrolled successfully"
}
```

---

### DELETE /students/{studentId}/enrollments
**Lambda:** `delete-enrollment`

**Description**  
Removes a student’s enrollment from a specific course.

**Authorization**
- Allowed roles: `student`, `admin`

**Path Parameters**
- `studentId` — unique ID(sub) of the student

**Request Body**
```json
{
  "courseId": "course-4"
}
```

**Successful Response (`200 OK`)**
```json
{
  "message": "Unenrolled successfully"
}
```


---

### GET /students/{studentId}/attendance
**Lambda:** `get-attendance`

**Description**  
Returns the attendance records for a student.

**Authorization**
- Allowed role: `student`

**Path Parameters**
- `studentId` — unique ID(sub) of the student

**Request Body**  
None

**Successful Response (`200 OK`)**
```json
[
  {
    "course": "Databases",
    "date": "2026-03-16",
    "presence": true
  },
  {
    "course": "Cloud Computing",
    "date": "2026-03-18",
    "presence": false
  },
  {
    "course": "Software Engineering",
    "date": "2026-03-22",
    "presence": true
  }
]
```

**Data Transformation Note**

Database format:
```json
{
  "studentID": "example-student-id",
  "date_courseID": "course-5#2026-03-16",
  "presence": true
}
```

API response format:
```json
{
  "course": "Software Engineering",
  "date": "2026-03-16",
  "presence": true
}
```

---

## Teachers

### POST /teachers/attendance
**Lambda:** `create-attendance`

**Description**  
Marks attendance for one or more students in a course.

**Authorization**
- Allowed role: `teacher`

**Request Body**
```json
{
  "entries": [
    {
      "studentName": "Denisa",
      "courseName": "Databases",
      "date": "2026-03-22",
      "presence": true
    },
    {
      "studentName": "Karolina",
      "courseName": "Databases",
      "date": "2026-03-22",
      "presence": false
    }
  ]
}
```

**Request Body Fields**
- `entries` — array of attendance records
- `studentName` — student name
- `courseName` — course name
- `date` — class date (`YYYY-MM-DD`)
- `presence` — `true` if present, `false` if absent

**Successful Response (`200 OK`)**
```json
{
  "message": "Attendance marked successfully"
}
```

**Data Transformation Note**

Frontend input:
```json
{
  "studentName": "Denisa",
  "courseName": "Databases"
}
```

Stored database structure:
```json
{
  "studentID": "example-student-id",
  "date_courseID": "course-1#2026-03-22",
  "presence": true
}
```

The backend converts:
- `studentName → studentID`
- `courseName → courseID`

before saving the record.

---

### GET /teachers/{teacherId}/courses
**Lambda:** `get-attendance-teacher`

**Description**  
Returns the list of courses assigned to a teacher.

**Authorization**
- Allowed role: `teacher`

**Path Parameters**
- `teacherId` — unique ID(sub) of the teacher/user

**Request Body**  
None

**Successful Response (`200 OK`)**
```json
[
  "Databases",
  "Algorithms",
  "Machine Learning",
  "Computer Networks 2"
]
```


### GET /teachers/{teacherId}/courses/{courseName}/students
**Lambda:** `get-attendance-teacher`

**Description**  
Returns the list of students enrolled in a specific course.

**Authorization**
- Allowed role: `teacher`
 
**Path Parameters**
- `teacherId` — unique ID(sub) of the teacher
- `courseName` — name of the course

**Request Body**  
None

**Successful Response (`200 OK`)**
```json
[
  {
    "name": "Denisa",
    "department": "Computer Science"
  },
  {
    "name": "Karolina",
    "department": "Computer Science"
  }
]
```

**Alternative Successful Response**
```json
{
  "message": "No students enrolled"
}
```

**Example failure case**
```json
{
  "error": "Course not found: Database 2"
}
```

---

## Admin

## Admin — Users

### PATCH /admin/users
**Lambda:** `update-users-page`

**Description**  
Updates the name of an existing user.

**Authorization**
- Allowed role: `admin`

**Request Body**
```json
{
  "currentName": "Karolina",
  "newName": "Karolina-student"
}
```

**Successful Response (`200 OK`)**
```json
{
  "message": "User renamed successfully"
}
```

**Implementation Note**  
This endpoint currently looks up the user by **name**, then renames the user using their internal ID. This assumes names are unique.

---

### GET /admin/users/students
**Lambda:** `get-users-page`

**Description**  
Returns a list of all students in the system.

**Authorization**
- Allowed role: `admin`

**Request Body**  
None

**Successful Response (`200 OK`)**
```json
[
  {
    "departmentID": "dept-1",
    "role": "student",
    "name": "Denisa",
    "userID": "example-user-id-1"
  },
  {
    "departmentID": "dept-1",
    "role": "student",
    "name": "Karolina",
    "userID": "example-user-id-2"
  }
]
```


---

### GET /admin/users/teachers
**Lambda:** `get-users-page`

**Description**  
Returns a list of all teachers in the system.

**Authorization**
- Allowed role: `admin`

**Request Body**  
None

**Successful Response (`200 OK`)**
```json
[
  {
    "departmentID": "dept-1",
    "role": "teacher",
    "name": "Rals",
    "userID": "example-test"
  }
]
```


## Admin — Courses

### POST /admin/courses
**Lambda:** `create-course`

**Description**  
Creates a new course and assigns it to a department.

**Authorization**
- Allowed role: `admin`

**Request Body**
```json
{
  "name": "Cloud Computing",
  "departmentId": "dept-1"
}
```

**Successful Response (`201 Created`)**
```json
{
  "courseID": "course-1774194350234",
  "name": "Algorithms",
  "departmentID": "dept-1"
}
```

---

### GET /admin/courses
**Lambda:** `get-course`

**Description**  
Returns a list of all courses along with their associated departments.

**Authorization**
- Allowed role: `admin`

**Request Body**  
None

**Successful Response (`200 OK`)**
```json
[
  {
    "courseID": "course-1773699885486",
    "name": "biotech2",
    "departmentID": "dept-2",
    "departmentName": "Bio"
  },
  {
    "courseID": "course-1773699943151",
    "name": "AI for Finance",
    "departmentID": "dept-1773699933044",
    "departmentName": "Artificial Intelligence"
  },
  {
    "courseID": "course-4",
    "name": "Databases",
    "departmentID": "dept-1",
    "departmentName": "Computer Science"
  }
]
```

### PATCH /admin/courses
**Lambda:** `update-course`

**Description**  
Updates the name of an existing course.

**Authorization**
- Allowed role: `admin`

**Request Body**
```json
{
  "courseName": "Databases",
  "newName": "Advanced Databases"
}
```

**Successful Response (`200 OK`)**
```json
{
  "message": "Course renamed successfully"
}
```

**Implementation Note**  
The backend identifies courses by **name**, so duplicate course names could create ambiguity.


### DELETE /admin/courses
**Lambda:** `delete-course`

**Description**  
Deletes an existing course from the system.

**Authorization**
- Allowed role: `admin`

**Request Body**
```json
{
  "courseName": "Databases"
}
```

**Successful Response (`200 OK`)**
```json
{
  "message": "Course deleted successfully"
}
```

**Implementation Note**  
This endpoint deletes a course by **name**, which assumes course names are unique.


## Admin — Departments

### POST /admin/departments
**Lambda:** `create-department`

**Description**  
Creates a new department in the system.

**Authorization**
- Allowed role: `admin`

**Request Body**
```json
{
  "name": "Computer Science"
}
```

**Successful Response (`201 Created`)**
```json
{
  "departmentID": "dept-1774195599364",
  "name": "Mathematics"
}
```


### POST /admin/departments/{departmentId}/courses
**Lambda:** `create-department`

**Description**  
Creates a new course within a specific department.

**Authorization**
- Allowed role: `admin`

**Path Parameters**
- `departmentId` — unique ID of the department

**Request Body**
```json
{
  "name": "Cloud Computing"
}
```

**Successful Response (`201 Created`)**
```json
{
  "courseID": "course-1774195754492",
  "name": "Cloud Computing",
  "departmentID": "dept-1"
}
```


### GET /admin/departments
**Lambda:** `get-department`

**Description**  
Returns a list of all departments in the system.

**Authorization**
- Allowed role: `admin`

**Request Body**  
None

**Successful Response (`200 OK`)**
```json
[
  {
    "name": "Artificial Intelligence",
    "departmentID": "dept-1773699933044"
  },
  {
    "name": "Bio",
    "departmentID": "dept-2"
  },
  {
    "name": "Mathematics",
    "departmentID": "dept-1774195599364"
  },
  {
    "name": "Chemistry",
    "departmentID": "dept-1773537256078"
  },
  {
    "name": "Computer Science",
    "departmentID": "dept-1"
  }
]
```


### GET /admin/departments/{departmentId}/courses
**Lambda:** `get-department`

**Description**  
Returns all courses that belong to a specific department.

**Authorization**
- Allowed role: `admin`

**Path Parameters**
- `departmentId` — unique ID of the department

**Request Body**  
None

**Successful Response (`200 OK`)**
```json
[
  {
    "courseID": "course-1774195754492",
    "name": "Cloud Computing",
    "departmentID": "dept-1"
  },
  {
    "courseID": "course-4",
    "name": "Databases",
    "departmentID": "dept-1"
  },
  {
    "courseID": "course-1773574137813",
    "name": "Algorithms Advanced",
    "departmentID": "dept-1"
  }
]
```

### DELETE /admin/departments
**Lambda:** `delete-department`

**Description**  
Deletes an existing department from the system.

**Authorization**
- Allowed role: `admin`

**Request Body**
```json
{
  "departmentId": "dept-1"
}
```

**Successful Response (`200 OK`)**
```json
{
  "message": "Department deleted successfully"
}
```

---

### PATCH /admin/departments/{departmentId}
**Lambda:** `update-department`

**Description**  
Updates the name of an existing department.

**Authorization**
- Allowed role: `admin`

**Path Parameters**
- `departmentId` — unique ID of the department

**Request Body**
```json
{
  "name": "Computer Engineering"
}
```

**Successful Response (`200 OK`)**
```json
{
  "message": "Department renamed successfully"
}
```

---

### PATCH /admin/departments/{departmentId}/courses/{courseName}
**Lambda:** `update-department`

**Description**  
Removes a course from a department.

**Authorization**
- Allowed role: `admin`

**Path Parameters**
- `departmentId` — unique ID of the department
- `courseName` — name of the course to remove

**Request Body**  
None

**Successful Response (`200 OK`)**
```json
{
  "message": "Course removed from department successfully"
}
```

**Implementation Note**  
Although the route contains `departmentId`, the current implementation removes the course using `courseName`.


## Admin — Student View

### GET /admin/students/{studentId}/enrollments
**Lambda:** `get-students-data`

**Description**  
Returns the enrolled and available courses for a specific student (admin view).

**Authorization**
- Allowed role: `admin`

**Path Parameters**
- `studentId` — unique ID(sub) of the student

**Request Body**  
None

**Successful Response (`200 OK`)**
```json
{
  "enrolledCourses": [
    {
      "courseID": "course-4",
      "name": "Databases",
      "departmentID": "dept-1"
    },
    {
      "courseID": "course-1773574137813",
      "name": "Algorithms Advanced",
      "departmentID": "dept-1"
    }
  ],
  "availableCourses": [
    {
      "courseID": "course-1774195754492",
      "name": "Cloud Computing",
      "departmentID": "dept-1"
    },
    {
      "courseID": "course-1774194350234",
      "name": "Algorithms",
      "departmentID": "dept-1"
    },
    {
      "courseID": "course-3",
      "name": "Machine Learning",
      "departmentID": "dept-1"
    }
  ]
}
```

**Possible Errors for all endpoints**
- `400 Bad Request`
```json
{
  "error": "name and departmentId are required"
}
```

- `403 Forbidden`
```json
{
  "error": "Forbidden"
}
```

- `500 Internal Server Error`
```json
{
  "error": "Internal server error"
}
```

## 🧪 Testing

This project uses **Vitest** for unit and integration testing. Tests live under `app/tests/`, mock DynamoDB, and avoid real AWS calls during normal test execution. 

### Run all tests

```bash
cd app
npm test
```

### Run a specific test file

```bash
npm test -- users.repository.test.ts
```

### Run integration tests

```bash
npm run test:integration
```

### Test Structure

```text
tests/
├── integration/
│   └── functions/
│       └── admin/
│           └── create-course.test.ts <- HTTP request test, however most lambdas have been tested through the AWS Console 
└── unit/
    ├── data/repositories/
    │   ├── attendance.repository.test.ts
    │   ├── courses.repository.test.ts
    │   ├── department.repository.test.ts
    │   ├── enrollments.repository.test.ts
    │   └── users.repository.test.ts
    ├── services/
    │   ├── adminServices.test.ts
    │   ├── studentService.test.ts
    │   ├── teacherService.test.ts
    │   └── userService.test.ts
    └── shared/
        └── rbac.test.ts
```

### Test Configuration Files

- `vitest.config.ts` — unit test config
- `vitest.integration.config.ts` — integration test config

---

## 🧪 Testing Lambda Functions via AWS Console

Instead of sending real HTTP requests through API Gateway, Lambda functions can be tested directly in the AWS Console using mock event JSON.

### How to create a test event

1. Open **AWS Lambda**
2. Open the target function
3. Go to the **Test** tab
4. Click **Create new event**
5. Give it a name
6. Paste mock event JSON
7. Click **Test**

### Base Event Structure

```json
{
  "routeKey": "GET /your/route",
  "pathParameters": {
    "someId": "some-value"
  },
  "body": "{\"key\": \"value\"}",
  "requestContext": {
    "authorizer": {
      "jwt": {
        "claims": {
          "sub": "<user-sub-here>",
          "cognito:groups": "Students"
        }
      }
    }
  }
}
```

### Notes
- `routeKey` is only needed if a Lambda handles multiple routes
- `pathParameters` is only needed for routes with path placeholders
- `body` is only needed for POST/PUT/PATCH/DELETE operations
- `body` must be a JSON string
- `cognito:groups` controls the resolved role:
  - `"Students"`
  - `"Teachers"`
  - `"Admins"`

### Common errors we encountered and fixes

**403 Forbidden**  
The `cognito:groups` claim is wrong or missing.

**500 - The provided key element does not match the schema**  
The provided ID does not match the expected DynamoDB table key.

**500 - ExpressionAttributeValues must not be empty**  
A required path parameter or request field was missing.

**500 - Not authorized to perform dynamodb:XYZ**  
The Lambda execution role is missing a required IAM permission.

**"The role defined for the function cannot be assumed by Lambda"**  
The trust policy for the Lambda execution role is broken or stale.

---

## ⚠️ Known Limitations

- Some endpoints do not enforce strict ownership checks
- A student may be able to modify another `studentId` by changing the URL
- Some teacher endpoints do not verify that `teacherId` matches the authenticated user
- Some admin operations identify resources by **name** rather than **ID**
- Deleting or renaming entities by name can become ambiguous if duplicate names exist
- The route `PATCH /admin/departments/{departmentId}/courses/{courseName}` includes `departmentId`, but the current implementation removes the course using only `courseName`
- The thrown errors are not specific to each case 

## 👥 Authors

Group 6 — DevOps and Cloud-based Software

- Ambra Mihu
- Raluca Chesca
- Karolina Kozieł
- Denisa Martac
