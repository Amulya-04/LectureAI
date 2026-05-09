const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', 'data');
const EXAM_FILE = path.join(DATA_DIR, 'faculty_exam.json');

function ensureFile() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(EXAM_FILE)) fs.writeFileSync(EXAM_FILE, '[]', 'utf8');
}

function getQuestions() {
  ensureFile();
  return JSON.parse(fs.readFileSync(EXAM_FILE, 'utf8'));
}

function saveQuestions(questions) {
  ensureFile();
  const validated = questions.filter(q => q.question?.trim() && q.answer?.trim())
    .map(q => ({ question: q.question.trim(), answer: q.answer.trim() }));
  fs.writeFileSync(EXAM_FILE, JSON.stringify(validated, null, 2), 'utf8');
  return validated;
}

function hasQuestions() {
  return getQuestions().length > 0;
}

module.exports = { getQuestions, saveQuestions, hasQuestions };
