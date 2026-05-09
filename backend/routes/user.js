const router = require('express').Router();
const { requireAuth } = require('../middleware/auth');
const { getUser, updateProgress } = require('../services/userStorage');

// GET /api/user/profile
router.get('/profile', requireAuth, async (req, res) => {
  try {
    const user = await getUser(req.user.username);
    if (!user) return res.status(404).json({ error: 'User not found.' });
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/user/progress  { score: number }
router.post('/progress', requireAuth, async (req, res) => {
  const { score } = req.body;
  if (score === undefined || score < 0 || score > 100) {
    return res.status(400).json({ error: 'Score must be 0–100.' });
  }
  try {
    const updated = await updateProgress(req.user.username, score);
    if (!updated) return res.status(404).json({ error: 'User not found.' });
    res.json({ message: 'Progress updated.', user: updated });
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
