const router = require('express').Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { requireAuth } = require('../middleware/auth');
const { transcribeAudio, summarizeLecture, askQuestion, generateQuiz } = require('../services/groqService');
const { saveLecture, getLecture, listLectures, deleteLecture } = require('../services/lectureStorage');
const { getUser } = require('../services/userStorage');

const UPLOADS_DIR = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, UPLOADS_DIR);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 30 * 1024 * 1024 },
  fileFilter: (_, file, cb) => {
    const allowed = ['audio/mpeg', 'audio/wav', 'audio/mp4', 'audio/ogg', 'audio/flac', 'audio/x-m4a', 'video/mp4'];
    cb(null, allowed.includes(file.mimetype) || file.originalname.match(/\.(mp3|wav|m4a|ogg|flac)$/i));
  }
});

// GET /api/lectures
router.get('/', requireAuth, (req, res) => {
  res.json(listLectures());
});

// GET /api/lectures/:title
router.get('/:title', requireAuth, (req, res) => {
  const lecture = getLecture(decodeURIComponent(req.params.title));
  if (!lecture) return res.status(404).json({ error: 'Lecture not found.' });
  res.json(lecture);
});

// POST /api/lectures/upload  multipart: audio file + title
router.post('/upload', requireAuth, upload.single('audio'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No audio file uploaded.' });
  const { title } = req.body;
  if (!title) return res.status(400).json({ error: 'Lecture title required.' });

  const audioPath = req.file.path;
  try {
    const transcript = await transcribeAudio(audioPath);
    const summary = await summarizeLecture(transcript);
    const lecture = saveLecture(title, transcript, summary);
    res.json({ message: 'Lecture processed.', lecture });
  } catch (err) {
    res.status(500).json({ error: err.message });
  } finally {
    if (fs.existsSync(audioPath)) fs.unlinkSync(audioPath);
  }
});

// DELETE /api/lectures/:title
router.delete('/:title', requireAuth, (req, res) => {
  const ok = deleteLecture(decodeURIComponent(req.params.title));
  if (!ok) return res.status(404).json({ error: 'Lecture not found.' });
  res.json({ message: 'Lecture deleted.' });
});

// POST /api/lectures/:title/ask  { question, chatHistory? }
router.post('/:title/ask', requireAuth, async (req, res) => {
  const lecture = getLecture(decodeURIComponent(req.params.title));
  if (!lecture) return res.status(404).json({ error: 'Lecture not found.' });
  const { question, chatHistory = [] } = req.body;
  if (!question) return res.status(400).json({ error: 'Question required.' });

  const user = getUser(req.user.username);
  const userLevel = user?.levelLabel || 'Beginner';

  try {
    const answer = await askQuestion(lecture.transcript, question, userLevel, chatHistory);
    res.json({ answer, userLevel });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/lectures/:title/quiz  { numQuestions? }
router.post('/:title/quiz', requireAuth, async (req, res) => {
  const lecture = getLecture(decodeURIComponent(req.params.title));
  if (!lecture) return res.status(404).json({ error: 'Lecture not found.' });

  const user = getUser(req.user.username);
  const userLevel = user?.levelLabel || 'Beginner';
  const numQuestions = parseInt(req.body.numQuestions) || 5;

  try {
    const quiz = await generateQuiz(lecture.transcript, numQuestions, userLevel);
    res.json({ quiz, userLevel });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
