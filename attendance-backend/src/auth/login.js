// src/auth/login.js
const crypto = require("crypto");
const { CognitoIdentityProviderClient, InitiateAuthCommand } = require("@aws-sdk/client-cognito-identity-provider");

const client = new CognitoIdentityProviderClient({ region: process.env.AWS_REGION });

/** SECRET_HASH = Base64(HMAC_SHA256(clientSecret, username)). Required when the app client has a client secret. */
function getSecretHash(username) {
  const secret = process.env.COGNITO_CLIENT_SECRET;
  if (!secret) return undefined;
  return crypto.createHmac("sha256", secret).update(username).digest("base64");
}

exports.handler = async (event) => {
  try {
    const body = typeof event.body === "string" ? JSON.parse(event.body) : event.body || {};
    const { email, password } = body;

    if (!email || !password) {
      return response(400, { message: "Email and password are required" });
    }

    const authParams = {
      USERNAME: email,
      PASSWORD: password,
    };
    const secretHash = getSecretHash(email);
    if (secretHash) authParams.SECRET_HASH = secretHash;

    const command = new InitiateAuthCommand({
      AuthFlow: "USER_PASSWORD_AUTH",
      ClientId: process.env.COGNITO_CLIENT_ID,
      AuthParameters: authParams,
    });

    const result = await client.send(command);

    if (result.ChallengeName === "NEW_PASSWORD_REQUIRED") {
      return response(400, { message: "Account requires a new password. Use the sign-up flow or contact support." });
    }

    const tokens = result.AuthenticationResult;
    return response(200, {
      accessToken: tokens.AccessToken,
      idToken: tokens.IdToken,
      refreshToken: tokens.RefreshToken,
    });

  } catch (error) {
    const isDev = process.env.NODE_ENV !== "production";
    const baseMsg = "Invalid email or password";

    if (error.name === "NotAuthorizedException") {
      return response(401, isDev ? { message: baseMsg, _debug: "NotAuthorizedException (wrong password or user not confirmed)" } : { message: baseMsg });
    }
    if (error.name === "UserNotFoundException") {
      return response(401, isDev ? { message: baseMsg, _debug: "UserNotFoundException (username not found; use exact value from Cognito Users)" } : { message: baseMsg });
    }
    if (error.name === "UserNotConfirmedException") {
      return response(401, isDev ? { message: baseMsg, _debug: "UserNotConfirmedException (mark email verified or confirm user in Cognito)" } : { message: baseMsg });
    }
    if (error.name === "NewPasswordRequiredException") {
      return response(400, { message: "Account requires a new password. Use the sign-up flow or contact support." });
    }

    console.error(error);
    return response(500, { message: "Internal server error" });
  }
};

const response = (statusCode, body) => ({
  statusCode,
  headers: {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*", // tighten this in production
  },
  body: JSON.stringify(body),
});