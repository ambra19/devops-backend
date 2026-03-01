# attendance-backend

Backend for the attendance system (login, signup, email verification).

## Setup

1. Install dependencies: `npm install`
2. Copy `.env.example` to `.env` and set your values (do not commit `.env`).
   - `AWS_REGION`: e.g. `eu-central-1`
   - `COGNITO_CLIENT_ID`: Cognito app client ID (no client secret for signup/login)
3. Run: `npm run dev` or `npm start`

## Cognito

- Use a **User Pool** with **email** as sign-in and **email verification** enabled (Cognito sends the code).
- **App client**: enable **ALLOW_USER_PASSWORD_AUTH**; create the client **without** a client secret.
- Set `COGNITO_CLIENT_ID` and `AWS_REGION` in `.env`.

## Sign up and email verification

1. **Sign up** – `POST /auth/signup` with `{ email, password }`. Cognito sends a verification code to the email.
2. **Confirm** – `POST /auth/confirm-signup` with `{ email, code }`. After success, the user can sign in.
3. UI: **Sign up** → enter code from email → **Confirm** → redirect to `/auth-success` (“Auth correct”).

## Run the UI

```bash
npm run dev:ui
```

Open **http://localhost:3000**. Sign in (existing users) or Sign up → enter code → confirm → redirect to `/auth-success`.

## Project structure

```
attendance-backend/
├── src/auth/
│   ├── login.js
│   ├── signUp.js
│   └── confirmSignUp.js
├── public/
│   ├── index.html
│   └── auth-success.html
├── server.js
├── package.json
├── .env.example
├── .env          (do not commit)
├── .gitignore
└── README.md
```
