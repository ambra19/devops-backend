/**
 * Login endpoint for attendance-backend
 */

function login(req, res) {
  // TODO: validate credentials and return token/session
  res.json({ message: 'Login endpoint' });
}

module.exports = { login };
