/**
 * Local server: login, signup, confirm-signup, and auth-success.
 */
require("dotenv").config();
const express = require("express");
const path = require("path");
const { handler: loginHandler } = require("./src/auth/login.js");
// const { handler: signUpHandler } = require("./src/auth/signUp.js");
// const { handler: confirmSignUpHandler } = require("./src/auth/confirmSignUp.js");

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

const runHandler = async (handler, req, res) => {
  try {
    const result = await handler({ body: req.body });
    const body = JSON.parse(result.body || "{}");
    res.status(result.statusCode).set(result.headers || {}).json(body);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Internal server error" });
  }
};

app.post("/auth/login", async (req, res) => runHandler(loginHandler, req, res));
// app.post("/auth/signup", async (req, res) => runHandler(signUpHandler, req, res));
// app.post("/auth/confirm-signup", async (req, res) => runHandler(confirmSignUpHandler, req, res));

app.get("/auth-success", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "auth-success.html"));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Login test UI: http://localhost:${PORT}`);
});
