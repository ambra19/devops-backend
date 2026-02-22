/**
 * Confirm sign up with the code sent to the user's email.
 * Body: { email, code }
 */
const { CognitoIdentityProviderClient, ConfirmSignUpCommand } = require("@aws-sdk/client-cognito-identity-provider");

const client = new CognitoIdentityProviderClient({ region: process.env.AWS_REGION });

exports.handler = async (event) => {
  try {
    const body = typeof event.body === "string" ? JSON.parse(event.body) : event.body || {};
    const { email, code } = body;

    if (!email || !code) {
      return response(400, { message: "Email and verification code are required" });
    }

    await client.send(
      new ConfirmSignUpCommand({
        ClientId: process.env.COGNITO_CLIENT_ID,
        Username: email,
        ConfirmationCode: code.trim(),
      })
    );

    return response(200, {
      message: "Email confirmed. You can now sign in.",
      username: email,
    });
  } catch (error) {
    if (error.name === "CodeMismatchException") {
      return response(400, { message: "Invalid or expired verification code." });
    }
    if (error.name === "ExpiredCodeException") {
      return response(400, { message: "Verification code has expired. Please sign up again or request a new code." });
    }
    if (error.name === "NotAuthorizedException") {
      return response(400, { message: "User is already confirmed or code is invalid." });
    }
    console.error(error);
    return response(500, { message: "Internal server error" });
  }
};

function response(statusCode, body) {
  return {
    statusCode,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
    },
    body: JSON.stringify(body),
  };
}
