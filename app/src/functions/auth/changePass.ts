import {
  CognitoIdentityProviderClient,
  InitiateAuthCommand,
  RespondToAuthChallengeCommand,
} from "@aws-sdk/client-cognito-identity-provider";
import { getParameter } from "../../shared/ssm";

const client = new CognitoIdentityProviderClient({ region: process.env.AWS_REGION });

export const handler = async (event: { body?: string | Record<string, unknown> }) => {
  try {
    const body = typeof event.body === "string" ? JSON.parse(event.body) : event.body ?? {};
    const { email, currentPassword, newPassword } = body as {
      email?: string;
      currentPassword?: string;
      newPassword?: string;
    };

    if (!email || !currentPassword || !newPassword) {
      return response(400, {
        message: "Email, current (temporary) password, and new password are required",
      });
    }

    // Read from SSM instead of env var
    const clientId = await getParameter("/attendance-app/cognito/client_id");

    const authResult = await client.send(
      new InitiateAuthCommand({
        AuthFlow: "USER_PASSWORD_AUTH",
        ClientId: clientId,
        AuthParameters: {
          USERNAME: email,
          PASSWORD: currentPassword,
        },
      })
    );

    if (authResult.ChallengeName !== "NEW_PASSWORD_REQUIRED" || !authResult.Session) {
      return response(400, {
        message: "You already have a permanent password. Use Sign in above, or use Change password when signed in.",
      });
    }

    const challengeResult = await client.send(
      new RespondToAuthChallengeCommand({
        ClientId: clientId,
        ChallengeName: "NEW_PASSWORD_REQUIRED",
        Session: authResult.Session,
        ChallengeResponses: {
          USERNAME: email,
          NEW_PASSWORD: newPassword,
        },
      })
    );

    const tokens = challengeResult.AuthenticationResult;
    if (!tokens) {
      return response(500, { message: "Internal server error" });
    }

    return response(200, {
      message: "Password set successfully. You are signed in.",
      idToken: tokens.IdToken,
      accessToken: tokens.AccessToken,
      refreshToken: tokens.RefreshToken,
    });
  } catch (error: unknown) {
    const err = error as { name?: string; message?: string };
    if (err.name === "NotAuthorizedException" || err.name === "UserNotFoundException") {
      return response(401, { message: "Email or temporary password is incorrect." });
    }
    if (err.name === "InvalidPasswordException") {
      return response(400, { message: err.message ?? "New password does not meet requirements." });
    }
    if (err.name === "LimitExceededException") {
      return response(429, { message: "Too many attempts. Try again later." });
    }
    console.error(error);
    return response(500, { message: "Internal server error" });
  }
};

function response(statusCode: number, body: object) {
  return {
    statusCode,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
    },
    body: JSON.stringify(body),
  };
}