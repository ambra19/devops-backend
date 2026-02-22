/**
 * Sign up a new user. Cognito sends a verification code to the email.
 * No client secret (public app client).
 * Body: { email, password }
 */
const { CognitoIdentityProviderClient, SignUpCommand } = require("@aws-sdk/client-cognito-identity-provider");

const client = new CognitoIdentityProviderClient({ region: process.env.AWS_REGION });

exports.handler = async (event) => {
  try {
    const body = typeof event.body === "string" ? JSON.parse(event.body) : event.body || {};
    const { email, password } = body;

    if (!email || !password) {
      return response(400, { message: "Email and password are required" });
    }

    await client.send(
      new SignUpCommand({
        ClientId: process.env.COGNITO_CLIENT_ID,
        Username: email,
        Password: password,
        UserAttributes: [
          { Name: "email", Value: email },
          { Name: "preferred_username", Value: email },
        ],
      })
    );

    return response(200, {
      message: "Sign up successful. Check your email for the verification code.",
      username: email,
    });
  } catch (error) {
    if (error.name === "UsernameExistsException") {
      return response(409, { message: "An account with this email already exists." });
    }
    if (error.name === "InvalidPasswordException") {
      return response(400, { message: error.message || "Password does not meet requirements." });
    }
    if (error.name === "InvalidParameterException") {
      return response(400, { message: error.message || "Invalid sign up parameters." });
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
