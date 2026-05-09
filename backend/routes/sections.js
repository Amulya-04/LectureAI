const router = require('express').Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { requireAuth, requireFaculty } = require('../middleware/auth');
const {
  createSection, listSections, getSection, enrollStudent,
  saveSectionLecture, getSectionLecture, deleteSectionLecture,
  getUnreadNotifications, markNotificationsRead,
  getSectionsByStudent, getSectionsByFaculty,
} = require('../services/sectionStorage');
const { transcribeAudio, summarizeLecture, askQuestion, generateQuiz, assessAnswers } = require('../services/groqService');
const { getUser, markSectionAssessed, isSectionAssessed } = require('../services/userStorage');

const UPLOADS_DIR = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOADS_DIR),
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  },
});
const upload = multer({
  storage,
  limits: { fileSize: 25 * 1024 * 1024 }, // 25MB limit for Groq API
  fileFilter: (_, file, cb) => {
    const allowed = ['audio/mpeg', 'audio/wav', 'audio/mp4', 'audio/ogg', 'audio/flac', 'audio/x-m4a', 'video/mp4'];
    cb(null, allowed.includes(file.mimetype) || /\.(mp3|wav|m4a|ogg|flac|mp4)$/i.test(file.originalname));
  },
});

// ── GET /api/sections ─────────────────────────────────────────────────────────
router.get('/', requireAuth, async (req, res) => {
  const { username, role } = req.user;
  try {
    if (role === 'faculty') {
      const sFaculty = await getSectionsByFaculty(username);
      const sections = sFaculty.map(s => ({
        id: s.id,
        name: s.name,
        faculty: s.faculty,
        studentCount: s.students.length,
        lectureCount: s.lectures.length,
        createdAt: s.createdAt,
      }));
      return res.json(sections);
    }
    // Students — browse all sections
    const sStudent = await getSectionsByStudent(username);
    const enrolled = sStudent.map(s => s.id);
    const allSections = await listSections();
    
    const all = await Promise.all(allSections.map(async s => {
      const isAssessed = await isSectionAssessed(username, s.id);
      return {
        id: s.id,
        name: s.name,
        faculty: s.faculty,
        studentCount: s.students.length,
        lectureCount: s.lectures.length,
        isEnrolled: enrolled.includes(s.id),
        isAssessed: isAssessed,
        hasExam: s.examQuestions.length > 0,
        createdAt: s.createdAt,
      };
    }));
    return res.json(all);
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ── POST /api/sections ────────────────────────────────────────────────────────
router.post('/', requireFaculty, async (req, res) => {
  const { name, examQuestions } = req.body;
  if (!name?.trim()) return res.status(400).json({ error: 'Section name required.' });
  try {
    const section = await createSection(name, req.user.username, examQuestions || []);
    res.json({ message: 'Section created.', section });
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ── GET /api/sections/:sectionId ──────────────────────────────────────────────
router.get('/:sectionId', requireAuth, async (req, res) => {
  try {
    const section = await getSection(req.params.sectionId);
    if (!section) return res.status(404).json({ error: 'Section not found.' });
    const { username, role } = req.user;
    if (role === 'faculty') return res.json(section);

    const enrolled = section.students.includes(username);
    const assessed = await isSectionAssessed(username, req.params.sectionId);
    if (!enrolled) {
      return res.json({
        id: section.id, name: section.name, faculty: section.faculty,
        studentCount: section.students.length, lectureCount: section.lectures.length,
        hasExam: section.examQuestions.length > 0, isEnrolled: false,
      });
    }
    const { examQuestions, ...safe } = section;
    return res.json({ ...safe, isEnrolled: true, isAssessed: assessed, hasExam: examQuestions.length > 0 });
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ── POST /api/sections/:sectionId/enroll ─────────────────────────────────────
router.post('/:sectionId/enroll', requireAuth, async (req, res) => {
  if (req.user.role !== 'student') return res.status(403).json({ error: 'Students only.' });
  try {
    const result = await enrollStudent(req.params.sectionId, req.user.username);
    if (!result.ok) return res.status(400).json({ error: result.error });
    res.json({ message: 'Enrolled successfully.' });
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ── GET /api/sections/:sectionId/exam ────────────────────────────────────────
router.get('/:sectionId/exam', requireAuth, async (req, res) => {
  if (req.user.role !== 'student') return res.status(403).json({ error: 'Students only.' });
  try {
    const section = await getSection(req.params.sectionId);
    if (!section) return res.status(404).json({ error: 'Section not found.' });
    if (!section.students.includes(req.user.username)) return res.status(403).json({ error: 'Not enrolled.' });
    const questions = section.examQuestions.map(q => ({ question: q.question }));
    res.json({ questions, sectionName: section.name });
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ── POST /api/sections/:sectionId/exam/assess ────────────────────────────────
router.post('/:sectionId/exam/assess', requireAuth, async (req, res) => {
  if (req.user.role !== 'student') return res.status(403).json({ error: 'Students only.' });
  try {
    const section = await getSection(req.params.sectionId);
    if (!section) return res.status(404).json({ error: 'Section not found.' });
    if (!section.students.includes(req.user.username)) return res.status(403).json({ error: 'Not enrolled.' });

    if (section.examQuestions.length === 0) {
      await markSectionAssessed(req.user.username, req.params.sectionId, 50);
      return res.json({ score: 50, levelLabel: 'Intermediate', feedback: 'No exam for this section. Access granted automatically.' });
    }

    const { answers } = req.body;
    if (!Array.isArray(answers)) return res.status(400).json({ error: 'Provide answers array.' });

    const result = await assessAnswers(section.examQuestions, answers);
    await markSectionAssessed(req.user.username, req.params.sectionId, result.score);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── GET /api/sections/:sectionId/lectures ────────────────────────────────────
router.get('/:sectionId/lectures', requireAuth, async (req, res) => {
  try {
    const section = await getSection(req.params.sectionId);
    if (!section) return res.status(404).json({ error: 'Section not found.' });
    const { username, role } = req.user;
    if (role === 'student' && !section.students.includes(username)) {
      return res.status(403).json({ error: 'Not enrolled.' });
    }
    res.json(section.lectures);
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ── POST /api/sections/:sectionId/lectures/upload ────────────────────────────
router.post('/:sectionId/lectures/upload', requireFaculty, upload.single('audio'), async (req, res) => {
  try {
    const section = await getSection(req.params.sectionId);
    if (!section) return res.status(404).json({ error: 'Section not found.' });
    if (section.faculty !== req.user.username) return res.status(403).json({ error: 'Not your section.' });
    if (!req.file) return res.status(400).json({ error: 'No audio/video file uploaded.' });
    const { title } = req.body;
    if (!title) return res.status(400).json({ error: 'Lecture title required.' });

    const audioPath = req.file.path;
    const fileUrl = '/uploads/' + req.file.filename;

    const transcript = await transcribeAudio(audioPath);
    const summary = await summarizeLecture(transcript);
    const lecture = await saveSectionLecture(req.params.sectionId, title, fileUrl, transcript, summary);
    res.json({ message: `Lecture processed. ${section.students.length} student(s) notified.`, lecture });
    
    // We intentionally DO NOT delete the audioPath here, so it can be played back.
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── GET /api/sections/:sectionId/lectures/:title ─────────────────────────────
router.get('/:sectionId/lectures/:title', requireAuth, async (req, res) => {
  try {
    const section = await getSection(req.params.sectionId);
    if (!section) return res.status(404).json({ error: 'Section not found.' });
    const { username, role } = req.user;
    if (role === 'student' && !section.students.includes(username)) {
      return res.status(403).json({ error: 'Not enrolled.' });
    }
    const lecture = await getSectionLecture(req.params.sectionId, decodeURIComponent(req.params.title));
    if (!lecture) return res.status(404).json({ error: 'Lecture not found.' });
    if (role === 'student') await markNotificationsRead(req.params.sectionId, username);
    res.json(lecture);
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ── DELETE /api/sections/:sectionId/lectures/:title ──────────────────────────
router.delete('/:sectionId/lectures/:title', requireFaculty, async (req, res) => {
  try {
    const section = await getSection(req.params.sectionId);
    if (!section) return res.status(404).json({ error: 'Section not found.' });
    if (section.faculty !== req.user.username) return res.status(403).json({ error: 'Not your section.' });
    
    const lecture = await getSectionLecture(req.params.sectionId, decodeURIComponent(req.params.title));
    if (lecture && lecture.fileUrl) {
      const filePath = path.join(__dirname, '..', lecture.fileUrl);
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    }
    
    const ok = await deleteSectionLecture(req.params.sectionId, decodeURIComponent(req.params.title));
    if (!ok) return res.status(404).json({ error: 'Lecture not found.' });
    res.json({ message: 'Lecture deleted.' });
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ── GET /api/sections/:sectionId/notifications ───────────────────────────────
router.get('/:sectionId/notifications', requireAuth, async (req, res) => {
  if (req.user.role !== 'student') return res.status(403).json({ error: 'Students only.' });
  try {
    const unread = await getUnreadNotifications(req.params.sectionId, req.user.username);
    res.json(unread);
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ── POST /api/sections/:sectionId/lectures/:title/ask ────────────────────────
router.post('/:sectionId/lectures/:title/ask', requireAuth, async (req, res) => {
  try {
    const section = await getSection(req.params.sectionId);
    if (!section) return res.status(404).json({ error: 'Section not found.' });
    const lecture = await getSectionLecture(req.params.sectionId, decodeURIComponent(req.params.title));
    if (!lecture) return res.status(404).json({ error: 'Lecture not found.' });
    const { question, chatHistory = [] } = req.body;
    if (!question) return res.status(400).json({ error: 'Question required.' });
    const user = await getUser(req.user.username);
    const userLevel = user?.levelLabel || 'Beginner';
    const answer = await askQuestion(lecture.transcript, question, userLevel, chatHistory);
    res.json({ answer, userLevel });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── POST /api/sections/:sectionId/lectures/:title/quiz ───────────────────────
router.post('/:sectionId/lectures/:title/quiz', requireAuth, async (req, res) => {
  try {
    const section = await getSection(req.params.sectionId);
    if (!section) return res.status(404).json({ error: 'Section not found.' });
    const lecture = await getSectionLecture(req.params.sectionId, decodeURIComponent(req.params.title));
    if (!lecture) return res.status(404).json({ error: 'Lecture not found.' });
    const user = await getUser(req.user.username);
    const userLevel = user?.levelLabel || 'Beginner';
    const numQuestions = parseInt(req.body.numQuestions) || 5;
    const quiz = await generateQuiz(lecture.transcript, numQuestions, userLevel);
    res.json({ quiz, userLevel });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── GET /api/sections/:sectionId/students (FACULTY TRACKING) ─────────────────
router.get('/:sectionId/students', requireFaculty, async (req, res) => {
  try {
    const section = await getSection(req.params.sectionId);
    if (!section) return res.status(404).json({ error: 'Section not found.' });
    if (section.faculty !== req.user.username) return res.status(403).json({ error: 'Not your section.' });

    const studentStats = await Promise.all(section.students.map(async (username) => {
      const user = await getUser(username);
      if (!user) return null;
      const assessment = user.sectionAssessments && user.sectionAssessments[section.id];
      return {
        username: user.username,
        levelScore: user.levelScore,
        levelLabel: user.levelLabel,
        streak: user.streak,
        longestStreak: user.longestStreak,
        lastActiveDate: user.lastActiveDate,
        assessmentScore: assessment ? assessment.score : null,
        assessmentLabel: assessment ? assessment.levelLabel : 'Unassessed',
      };
    }));
    
    res.json(studentStats.filter(Boolean));
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
