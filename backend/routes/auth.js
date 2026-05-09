const router = require('express').Router();
const { createUser, verifyUser, recordActivity } = require('../services/userStorage');
const { createToken } = require('../middleware/auth');

// POST /api/auth/register
router.post('/register', async (req, res) => {
  const { username, password, role } = req.body;
  if (!username || !password) return res.status(400).json({ error: 'Username and password required.' });
  try {
    const result = await createUser(username, password, role || 'student');
    if (!result.ok) return res.status(409).json({ error: result.error });
    res.json({ message: 'User created successfully.' });
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.status(400).json({ error: 'Username and password required.' });
  try {
    const user = await verifyUser(username, password);
    if (!user) return res.status(401).json({ error: 'Invalid credentials.' });

    // Record streak activity for students
    let streakInfo = {};
    if (user.role === 'student') {
      streakInfo = await recordActivity(user.username);
    }

    const token = createToken(user.username, user.role);
    res.json({ token, user: { ...user, ...streakInfo } });
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
