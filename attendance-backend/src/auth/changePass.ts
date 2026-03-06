/**
 * Set a new password when the user has a temporary password (e.g. created in AWS dashboard).
 * No token required: we use email + temporary password to get a challenge session, then submit the new password.
 * Body: { email, currentPassword, newPassword }
 */
import {
  CognitoIdentityProviderClient,
  InitiateAuthCommand,
  RespondToAuthChallengeCommand,
} from "@aws-sdk/client-cognito-identity-provider";

const client = new CognitoIdentityProviderClient({ region: process.env.AWS_REGION });

export const handler = async (event: { body?: string | Record<string, unknown> }) => {
    try {
      const body = typeof event.body === "string" ? JSON.parse(event.body) : event.body || {};
      const { email, currentPassword, newPassword } = body;
  
      if (!email || !currentPassword || !newPassword) {
        return response(400, { message: "Email, current (temporary) password, and new password are required" });
      }
  
      const authParams = {
        USERNAME: email,
        PASSWORD: currentPassword,
      };
  
      const authResult = await client.send(
        new InitiateAuthCommand({
          AuthFlow: "USER_PASSWORD_AUTH",
          ClientId: process.env.COGNITO_CLIENT_ID,
          AuthParameters: authParams,
        })
      );
  
      if (authResult.ChallengeName !== "NEW_PASSWORD_REQUIRED" || !authResult.Session) {
        return response(400, {
          message: "You already have a permanent password. Use Sign in above, or use Change password when signed in.",
        });
      }
  
      const challengeResponses = {
        USERNAME: email,
        NEW_PASSWORD: newPassword,
      };
  
      const challengeResult = await client.send(
        new RespondToAuthChallengeCommand({
          ClientId: process.env.COGNITO_CLIENT_ID,
          ChallengeName: "NEW_PASSWORD_REQUIRED",
          Session: authResult.Session,
          ChallengeResponses: challengeResponses,
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
      if (err.name === "NotAuthorizedException") {
        return response(401, { message: "Email or temporary password is incorrect." });
      }
      if (err.name === "UserNotFoundException") {
        return response(401, { message: "Email or temporary password is incorrect." });
      }
      if (err.name === "InvalidPasswordException") {
        return response(400, { message: err.message ?? "New password does not meet requirements." });
      }
      if (err.name === "LimitExceededException") {
        return response(400, { message: "Too many attempts. Try again later." });
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