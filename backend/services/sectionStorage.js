const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const Section = require('../models/Section');

async function createSection(name, facultyUsername, examQuestions = []) {
  const section = new Section({
    name: name.trim(),
    faculty: facultyUsername,
    students: [],
    examQuestions: examQuestions.filter(q => q.question?.trim() && q.answer?.trim()),
    lectures: [],
    notifications: []
  });
  await section.save();
  const saved = section.toObject();
  saved.id = saved._id.toString();
  return saved;
}

async function listSections() {
  const sections = await Section.find({});
  return sections.map(s => {
    const obj = s.toObject();
    obj.id = obj._id.toString();
    return obj;
  });
}

async function getSection(sectionId) {
  try {
    const section = await Section.findById(sectionId);
    if (!section) return null;
    const obj = section.toObject();
    obj.id = obj._id.toString();
    return obj;
  } catch (err) {
    return null;
  }
}

async function enrollStudent(sectionId, username) {
  try {
    const section = await Section.findById(sectionId);
    if (!section) return { ok: false, error: 'Section not found.' };
    if (section.students.includes(username)) return { ok: false, error: 'Already enrolled.' };
    section.students.push(username);
    await section.save();
    return { ok: true };
  } catch (err) {
    return { ok: false, error: 'Invalid section ID.' };
  }
}

function safeFilename(title) {
  return title.replace(/[^a-z0-9 _-]/gi, '_').trim().replace(/\s+/g, '_').toLowerCase().slice(0, 80);
}

// Now saves lecture entirely inside Section document
async function saveSectionLecture(sectionId, title, fileUrl, transcript, summary) {
  const section = await Section.findById(sectionId);
  if (!section) return null;

  const data = {
    title,
    fileUrl,
    transcript,
    summary,
    wordCount: transcript.split(/\s+/).length,
    createdAt: new Date().toISOString(),
  };

  // Replace if same title
  section.lectures = section.lectures.filter(l => l.title !== title);
  section.lectures.push(data);

  // Push notification for all enrolled students
  section.notifications = section.notifications.filter(n => n.lectureTitle !== title);
  section.notifications.push({
    lectureTitle: title,
    createdAt: data.createdAt,
    readBy: [],
  });

  await section.save();
  return data;
}

async function getSectionLecture(sectionId, title) {
  const section = await getSection(sectionId);
  if (!section) return null;
  return section.lectures.find(l => l.title === title) || null;
}

async function deleteSectionLecture(sectionId, title) {
  const section = await Section.findById(sectionId);
  if (!section) return false;
  
  const initialLength = section.lectures.length;
  section.lectures = section.lectures.filter(l => l.title !== title);
  section.notifications = section.notifications.filter(n => n.lectureTitle !== title);
  
  if (section.lectures.length === initialLength) return false; // not found
  
  await section.save();
  return true;
}

async function getUnreadNotifications(sectionId, username) {
  const section = await getSection(sectionId);
  if (!section) return [];
  return section.notifications.filter(n => !n.readBy.includes(username));
}

async function markNotificationsRead(sectionId, username) {
  const section = await Section.findById(sectionId);
  if (!section) return;
  section.notifications.forEach(n => {
    if (!n.readBy.includes(username)) n.readBy.push(username);
  });
  await section.save();
}

async function getSectionsByStudent(username) {
  const sections = await Section.find({ students: username });
  return sections.map(s => {
    const obj = s.toObject();
    obj.id = obj._id.toString();
    return obj;
  });
}

async function getSectionsByFaculty(username) {
  const sections = await Section.find({ faculty: username });
  return sections.map(s => {
    const obj = s.toObject();
    obj.id = obj._id.toString();
    return obj;
  });
}

module.exports = {
  createSection,
  listSections,
  getSection,
  enrollStudent,
  saveSectionLecture,
  getSectionLecture,
  deleteSectionLecture,
  getUnreadNotifications,
  markNotificationsRead,
  getSectionsByStudent,
  getSectionsByFaculty,
};
