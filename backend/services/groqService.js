const Groq = require('groq-sdk');
const fs = require('fs');
const path = require('path');

let groq;
function getGroq() {
  if (!groq) groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
  return groq;
}

// ── Chunk transcript for context window ──────────────────────────────────────
function chunkTranscript(transcript, chunkSize = 3000, overlap = 300) {
  const chunks = [];
  let start = 0;
  while (start < transcript.length) {
    chunks.push(transcript.slice(start, start + chunkSize));
    start += chunkSize - overlap;
  }
  return chunks;
}

function findRelevantChunks(transcript, query, topK = 4) {
  const chunks = chunkTranscript(transcript);
  const queryWords = new Set(query.toLowerCase().split(/\W+/).filter(w => w.length > 3));
  const scored = chunks.map((chunk, i) => {
    const words = chunk.toLowerCase().split(/\W+/);
    const score = words.filter(w => queryWords.has(w)).length;
    return { chunk, score, index: i };
  });
  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, topK).map(s => s.chunk).join('\n\n---\n\n');
}

// ── Transcription ─────────────────────────────────────────────────────────────
async function transcribeAudio(filePath) {
  const client = getGroq();
  const fileStream = fs.createReadStream(filePath);
  const transcription = await client.audio.transcriptions.create({
    file: fileStream,
    model: 'whisper-large-v3',
    response_format: 'text',
  });
  return typeof transcription === 'string' ? transcription : transcription.text;
}

// ── Summarization ─────────────────────────────────────────────────────────────
async function summarizeLecture(transcript) {
  const client = getGroq();
  const excerpt = transcript.slice(0, 12000);
  const resp = await client.chat.completions.create({
    model: process.env.GROQ_MODEL || 'llama-3.3-70b-versatile',
    temperature: 0.3,
    max_tokens: 2048,
    messages: [
      {
        role: 'system',
        content: 'You are an expert educator. Summarize lectures in structured JSON. Respond ONLY with valid JSON, no markdown.'
      },
      {
        role: 'user',
        content: `Summarize this lecture transcript as JSON with keys: overview (string), key_topics (array of strings), main_points (array of strings), key_concepts (array of strings), action_items (array of strings).\n\nTranscript:\n${excerpt}`
      }
    ]
  });
  try {
    let raw = resp.choices[0].message.content.trim();
    raw = raw.replace(/```json|```/g, '').trim();
    return JSON.parse(raw);
  } catch {
    return { overview: resp.choices[0].message.content, key_topics: [], main_points: [], key_concepts: [], action_items: [] };
  }
}

// ── Q&A ───────────────────────────────────────────────────────────────────────
async function askQuestion(transcript, question, userLevel = 'Beginner', chatHistory = []) {
  const client = getGroq();
  const context = findRelevantChunks(transcript, question);
  const levelGuide = {
    Beginner: 'Use simple everyday language, relatable analogies, avoid jargon, explain step by step.',
    Intermediate: 'Use proper terminology, assume some background knowledge, explain moderately complex ideas.',
    Advanced: 'Use precise technical language, go deep into nuances, assume strong domain familiarity.',
  };
  const systemPrompt = `You are a personalized AI lecture tutor for a ${userLevel} level student.
${levelGuide[userLevel] || levelGuide.Beginner}
Answer ONLY from the provided lecture context. If the answer is not there, say so honestly.`;

  const messages = [
    { role: 'system', content: systemPrompt },
    ...chatHistory.slice(-6).map(m => ({ role: m.role, content: m.content })),
    { role: 'user', content: `Lecture Context:\n${context}\n\nQuestion: ${question}` }
  ];

  const resp = await client.chat.completions.create({
    model: process.env.GROQ_MODEL || 'llama-3.3-70b-versatile',
    temperature: 0.4,
    max_tokens: 1024,
    messages,
  });
  return resp.choices[0].message.content;
}

// ── Quiz generation ───────────────────────────────────────────────────────────
async function generateQuiz(transcript, numQuestions = 5, userLevel = 'Beginner') {
  const client = getGroq();
  const excerpt = transcript.slice(0, 10000);
  const resp = await client.chat.completions.create({
    model: process.env.GROQ_MODEL || 'llama-3.3-70b-versatile',
    temperature: 0.5,
    max_tokens: 2048,
    messages: [
      {
        role: 'system',
        content: `You are an expert educator creating a quiz for a ${userLevel} level student. Respond ONLY with a valid JSON array, no markdown.`
      },
      {
        role: 'user',
        content: `Create exactly ${numQuestions} multiple-choice questions from this lecture for a ${userLevel} student.\nFormat: [{"question":"...","options":["A) ...","B) ...","C) ...","D) ..."],"answer":"A) ...","explanation":"..."}]\n\nTranscript:\n${excerpt}`
      }
    ]
  });
  try {
    let raw = resp.choices[0].message.content.trim().replace(/```json|```/g, '').trim();
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

// ── Assessment scoring ────────────────────────────────────────────────────────
async function assessAnswers(questions, studentAnswers) {
  const client = getGroq();
  const qa = questions.map((q, i) => `Q: ${q.question}\nExpected: ${q.answer}\nStudent said: ${studentAnswers[i] || '(no answer)'}`).join('\n\n');
  const resp = await client.chat.completions.create({
    model: process.env.GROQ_MODEL || 'llama-3.3-70b-versatile',
    temperature: 0.2,
    max_tokens: 512,
    messages: [
      { role: 'system', content: 'You are an examiner. Score student answers and respond ONLY with valid JSON, no markdown.' },
      { role: 'user', content: `Score these answers 0-100. Be fair — partial credit is allowed.\nRespond ONLY with JSON: {"score": <number 0-100>, "feedback": "<brief overall feedback>", "perQuestion": [{"score": <0-10>, "comment": "..."}]}\n\n${qa}` }
    ]
  });
  try {
    let raw = resp.choices[0].message.content.trim().replace(/```json|```/g, '').trim();
    return JSON.parse(raw);
  } catch {
    return { score: 50, feedback: 'Assessment complete.', perQuestion: [] };
  }
}

module.exports = { transcribeAudio, summarizeLecture, askQuestion, generateQuiz, assessAnswers };
