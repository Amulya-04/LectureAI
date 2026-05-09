const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', 'data');
const INDEX_FILE = path.join(DATA_DIR, 'lecture_index.json');
const LECTURES_DIR = path.join(DATA_DIR, 'lectures');

function ensureDirs() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(LECTURES_DIR)) fs.mkdirSync(LECTURES_DIR, { recursive: true });
  if (!fs.existsSync(INDEX_FILE)) fs.writeFileSync(INDEX_FILE, '[]', 'utf8');
}

function safeFilename(title) {
  return title.replace(/[^a-z0-9 _-]/gi, '_').trim().replace(/\s+/g, '_').toLowerCase().slice(0, 80);
}

function readIndex() {
  ensureDirs();
  return JSON.parse(fs.readFileSync(INDEX_FILE, 'utf8'));
}

function writeIndex(data) {
  ensureDirs();
  fs.writeFileSync(INDEX_FILE, JSON.stringify(data, null, 2), 'utf8');
}

function saveLecture(title, transcript, summary) {
  ensureDirs();
  const safe = safeFilename(title);
  const filePath = path.join(LECTURES_DIR, `${safe}.json`);
  const data = {
    title, transcript, summary,
    wordCount: transcript.split(/\s+/).length,
    createdAt: new Date().toISOString(),
  };
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
  let index = readIndex().filter(l => l.title !== title);
  index.push({ title, file: `${safe}.json`, createdAt: data.createdAt, wordCount: data.wordCount });
  writeIndex(index);
  return data;
}

function getLecture(title) {
  ensureDirs();
  const index = readIndex();
  const entry = index.find(l => l.title === title);
  if (!entry) return null;
  const filePath = path.join(LECTURES_DIR, entry.file);
  if (!fs.existsSync(filePath)) return null;
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function listLectures() {
  return readIndex();
}

function deleteLecture(title) {
  const index = readIndex();
  const entry = index.find(l => l.title === title);
  if (!entry) return false;
  const filePath = path.join(LECTURES_DIR, entry.file);
  if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
  writeIndex(index.filter(l => l.title !== title));
  return true;
}

module.exports = { saveLecture, getLecture, listLectures, deleteLecture };
