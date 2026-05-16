const router = require('express').Router();
const { createUser, verifyUser, recordActivity } = require('../services/userStorage');
const { createToken } = require('../middleware/auth');

// POST /api/auth/register
router.post('/register', async (req, res) => {
  const { username, password, role } = req.body;

  // Validate input
  if (!username || !password) {
    return res.status(400).json({
      error: 'Username and password required.'
    });
  }

  try {
    console.log("Register request received:", req.body);

    // Create user
    const result = await createUser(
      username,
      password,
      role || 'student'
    );

    console.log("Create user result:", result);

    // Handle duplicate/error
    if (!result.ok) {
      return res.status(409).json({
        error: result.error
      });
    }

    // Success
    res.json({
      message: 'User created successfully.'
    });

  } catch (err) {
    console.log("REGISTER ERROR:");
    console.log(err);

    res.status(500).json({
      error: err.message || 'Internal server error'
    });
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  const { username, password } = req.body;

  // Validate input
  if (!username || !password) {
    return res.status(400).json({
      error: 'Username and password required.'
    });
  }

  try {
    console.log("Login request received:", username);

    // Verify user
    const user = await verifyUser(username, password);

    if (!user) {
      return res.status(401).json({
        error: 'Invalid credentials.'
      });
    }

    // Record streak activity for students
    let streakInfo = {};

    if (user.role === 'student') {
      streakInfo = await recordActivity(user.username);
    }

    // Generate token
    const token = createToken(user.username, user.role);

    // Send response
    res.json({
      token,
      user: {
        ...user,
        ...streakInfo
      }
    });

  } catch (err) {
    console.log("LOGIN ERROR:");
    console.log(err);

    res.status(500).json({
      error: err.message || 'Internal server error'
    });
  }
});

module.exports = router;