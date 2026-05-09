const router = require('express').Router();
const { requireAuth, requireFaculty } = require('../middleware/auth');
const { getQuestions, saveQuestions, hasQuestions } = require('../services/examStorage');
const { assessAnswers } = require('../services/groqService');
const { markAssessed } = require('../services/userStorage');

// GET /api/exam/questions  (students get questions without answers)
router.get('/questions', requireAuth, (req, res) => {
  const questions = getQuestions();
  if (req.user.role === 'student') {
    // Strip expected answers from student view
    res.json(questions.map(q => ({ question: q.question })));
  } else {
    res.json(questions);
  }
});

// POST /api/exam/manage  (faculty only) { questions: [{question, answer}] }
router.post('/manage', requireFaculty, (req, res) => {
  const { questions } = req.body;
  if (!Array.isArray(questions) || questions.length === 0) {
    return res.status(400).json({ error: 'Provide at least one question.' });
  }
  const saved = saveQuestions(questions);
  res.json({ message: `${saved.length} question(s) saved.`, questions: saved });
});

// POST /api/exam/assess  (students submit answers) { answers: [string] }
router.post('/assess', requireAuth, async (req, res) => {
  if (req.user.role !== 'student') return res.status(403).json({ error: 'Students only.' });
  const { answers } = req.body;
  if (!Array.isArray(answers)) return res.status(400).json({ error: 'Provide answers array.' });

  const questions = getQuestions();
  if (questions.length === 0) return res.status(400).json({ error: 'No exam questions set yet.' });

  try {
    const result = await assessAnswers(questions, answers);
    markAssessed(req.user.username, result.score);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/exam/status
router.get('/status', requireAuth, (req, res) => {
  res.json({ hasQuestions: hasQuestions(), count: getQuestions().length });
});

module.exports = router;
