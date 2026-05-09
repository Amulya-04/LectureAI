const bcrypt = require('bcryptjs');
const User = require('../models/User');

function deriveLabel(score) {
  if (score < 40) return 'Beginner';
  if (score < 75) return 'Intermediate';
  return 'Advanced';
}

async function createUser(username, password, role = 'student') {
  const key = username.trim().toLowerCase();
  if (!key || !password) return { ok: false, error: 'Username and password required.' };
  if (!['student', 'faculty'].includes(role)) return { ok: false, error: 'Invalid role.' };
  
  const exists = await User.findOne({ username: key });
  if (exists) return { ok: false, error: `Username '${key}' already exists.` };

  const passwordHash = bcrypt.hashSync(password, 10);
  const user = new User({
    username: key,
    passwordHash,
    role,
    levelScore: 0,
    levelLabel: 'Beginner',
    assessed: false,
    progressHistory: [],
    streak: 0,
    lastActiveDate: null,
    longestStreak: 0,
  });
  await user.save();
  return { ok: true };
}

async function verifyUser(username, password) {
  const key = username.trim().toLowerCase();
  const user = await User.findOne({ username: key });
  if (!user) return null;
  if (!bcrypt.compareSync(password, user.passwordHash)) return null;
  const safe = user.toObject();
  delete safe.passwordHash;
  return safe;
}

async function getUser(username) {
  const key = username.trim().toLowerCase();
  const user = await User.findOne({ username: key });
  if (!user) return null;
  const safe = user.toObject();
  delete safe.passwordHash;
  return safe;
}

async function recordActivity(username) {
  const key = username.trim().toLowerCase();
  const user = await User.findOne({ username: key });
  if (!user) return {};

  const today = new Date().toISOString().split('T')[0];
  const last = user.lastActiveDate;
  let { streak = 0, longestStreak = 0 } = user;
  let status;

  if (!last) {
    streak = 1; status = 'started';
  } else if (last === today) {
    status = 'already_counted';
  } else {
    const diff = Math.round((new Date(today) - new Date(last)) / 86400000);
    if (diff === 1) { streak += 1; status = 'continued'; }
    else { streak = 1; status = 'reset'; }
  }

  if (streak > longestStreak) longestStreak = streak;
  user.streak = streak;
  user.longestStreak = longestStreak;
  user.lastActiveDate = today;
  await user.save();
  return { streak, longestStreak, status };
}

async function updateProgress(username, quizScore) {
  const key = username.trim().toLowerCase();
  const user = await User.findOne({ username: key });
  if (!user) return null;

  user.progressHistory.push({ date: new Date().toISOString(), score: quizScore });
  const n = user.progressHistory.length;
  const weightedSum = user.progressHistory.reduce((sum, h, i) => sum + (i + 1) * h.score, 0);
  const totalWeight = (n * (n + 1)) / 2;
  user.levelScore = Math.round((weightedSum / totalWeight) * 100) / 100;
  user.levelLabel = deriveLabel(user.levelScore);
  user.assessed = true;
  await user.save();
  const safe = user.toObject();
  delete safe.passwordHash;
  return safe;
}

async function markAssessed(username, initialScore) {
  const key = username.trim().toLowerCase();
  const user = await User.findOne({ username: key });
  if (!user) return false;
  
  user.assessed = true;
  user.levelScore = initialScore;
  user.levelLabel = deriveLabel(initialScore);
  user.progressHistory.push({ date: new Date().toISOString(), score: initialScore, type: 'initial_assessment' });
  await user.save();
  return true;
}

async function markSectionAssessed(username, sectionId, score) {
  const key = username.trim().toLowerCase();
  const user = await User.findOne({ username: key });
  if (!user) return false;

  user.sectionAssessments.set(sectionId, {
    assessed: true,
    score,
    levelLabel: deriveLabel(score),
    date: new Date().toISOString(),
  });

  user.progressHistory.push({ date: new Date().toISOString(), score, type: 'section_assessment', sectionId });
  const n = user.progressHistory.length;
  const weightedSum = user.progressHistory.reduce((sum, h, i) => sum + (i + 1) * h.score, 0);
  const totalWeight = (n * (n + 1)) / 2;
  user.levelScore = Math.round((weightedSum / totalWeight) * 100) / 100;
  user.levelLabel = deriveLabel(user.levelScore);
  user.assessed = true;
  await user.save();
  return true;
}

async function isSectionAssessed(username, sectionId) {
  const key = username.trim().toLowerCase();
  const user = await User.findOne({ username: key });
  if (!user) return false;
  const sa = user.sectionAssessments.get(sectionId);
  return !!(sa && sa.assessed);
}

async function listUsers(role = null) {
  const query = role ? { role } : {};
  const users = await User.find(query);
  return users.map(u => {
    const safe = u.toObject();
    delete safe.passwordHash;
    return safe;
  });
}

module.exports = { createUser, verifyUser, getUser, recordActivity, updateProgress, markAssessed, markSectionAssessed, isSectionAssessed, listUsers };
