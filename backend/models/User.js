const mongoose = require('mongoose');

const ProgressHistorySchema = new mongoose.Schema({
  date: String,
  score: Number,
  type: String, // 'initial_assessment' | 'section_assessment' | 'quiz'
  sectionId: String
}, { _id: false });

const SectionAssessmentSchema = new mongoose.Schema({
  assessed: Boolean,
  score: Number,
  levelLabel: String,
  date: String
}, { _id: false });

const UserSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true, lowercase: true, trim: true },
  passwordHash: { type: String, required: true },
  role: { type: String, enum: ['student', 'faculty'], default: 'student' },
  levelScore: { type: Number, default: 0 },
  levelLabel: { type: String, default: 'Beginner' },
  assessed: { type: Boolean, default: false },
  progressHistory: [ProgressHistorySchema],
  streak: { type: Number, default: 0 },
  lastActiveDate: { type: String, default: null },
  longestStreak: { type: Number, default: 0 },
  createdAt: { type: String, default: () => new Date().toISOString() },
  sectionAssessments: {
    type: Map,
    of: SectionAssessmentSchema,
    default: {}
  }
});

module.exports = mongoose.model('User', UserSchema);
