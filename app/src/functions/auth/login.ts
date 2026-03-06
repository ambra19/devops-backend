/**
 * Sign in with email and password. Returns Cognito tokens.
 * Body: { email, password }
 * If user has temporary password, returns 400 with message to use change-pass.
 */
import {
  CognitoIdentityProviderClient,
  InitiateAuthCommand,
} from "@aws-sdk/client-cognito-identity-provider";

const client = new CognitoIdentityProviderClient({ region: process.env.AWS_REGION });

export const handler = async (event: { body?: string | Record<string, unknown> }) => {
  try {
    const body = typeof event.body === "string" ? JSON.parse(event.body) : event.body ?? {};
    const { email, password } = body as { email?: string; password?: string };

    if (!email || !password) {
      return response(400, { message: "Email and password are required" });
    }

    const authResult = await client.send(
      new InitiateAuthCommand({
        AuthFlow: "USER_PASSWORD_AUTH",
        ClientId: process.env.COGNITO_CLIENT_ID,
        AuthParameters: {
          USERNAME: email,
          PASSWORD: password,
        },
      })
    );

    if (authResult.ChallengeName === "NEW_PASSWORD_REQUIRED") {
      return response(400, {
        message: "Temporary password in use. Use the change-password flow first.",
      });
    }

    const tokens = authResult.AuthenticationResult;
    if (!tokens) {
      return response(500, { message: "Internal server error" });
    }

    return response(200, {
      message: "Signed in successfully.",
      idToken: tokens.IdToken,
      accessToken: tokens.AccessToken,
      refreshToken: tokens.RefreshToken,
    });
  } catch (error: unknown) {
    const err = error as { name?: string; message?: string };
    if (err.name === "NotAuthorizedException" || err.name === "UserNotFoundException") {
      return response(401, { message: "Email or password is incorrect." });
    }
    if (err.name === "InvalidPasswordException") {
      return response(400, { message: err.message ?? "Invalid password." });
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
