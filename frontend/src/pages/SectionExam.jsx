import { useState, useEffect } from 'react';
import { sectionAPI } from '../api/client';

export default function SectionExam({ section, onComplete, onSkip }) {
  const [questions, setQuestions] = useState([]);
  const [answers, setAnswers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    sectionAPI.getExam(section.id)
      .then(({ data }) => {
        setQuestions(data.questions);
        setAnswers(new Array(data.questions.length).fill(''));
      })
      .catch(() => setError('Failed to load exam.'))
      .finally(() => setLoading(false));
  }, [section.id]);

  const submit = async () => {
    if (answers.some(a => !a.trim())) return;
    setSubmitting(true); setError('');
    try {
      const { data } = await sectionAPI.assessExam(section.id, answers);
      setResult(data);
    } catch (e) {
      setError(e.response?.data?.error || 'Failed to submit exam.');
    } finally { setSubmitting(false); }
  };

  const levelColor = (label) => {
    if (label === 'Advanced') return '#a78bfa';
    if (label === 'Intermediate') return '#34d399';
    return '#60a5fa';
  };

  if (loading) return (
    <div className="spinner-center"><div className="spinner spinner-lg" /></div>
  );

  if (result) return (
    <div style={{ maxWidth: '520px', margin: '3rem auto' }}>
      <div className="card" style={{ textAlign: 'center', padding: '2.5rem' }}>
        <div style={{ fontSize: '3.5rem', marginBottom: '1rem' }}>
          {result.score >= 75 ? '🏆' : result.score >= 40 ? '📈' : '📚'}
        </div>
        <h2 style={{ marginBottom: '0.5rem' }}>Exam Complete!</h2>
        <div style={{
          fontSize: '3rem', fontWeight: 800,
          color: levelColor(result.levelLabel),
          margin: '1rem 0',
        }}>{result.score}%</div>
        <div className="badge" style={{
          background: levelColor(result.levelLabel) + '22',
          color: levelColor(result.levelLabel),
          padding: '0.4rem 1.2rem', borderRadius: '999px',
          fontSize: '1rem', fontWeight: 700, marginBottom: '1.5rem',
          display: 'inline-block',
        }}>
          {result.levelLabel}
        </div>
        {result.feedback && (
          <p className="text-muted text-sm" style={{ marginBottom: '1.5rem', lineHeight: 1.6 }}>
            {result.feedback}
          </p>
        )}
        <button className="btn btn-primary btn-full" onClick={() => onComplete(result)}>
          🎉 Access Lectures →
        </button>
      </div>
    </div>
  );

  return (
    <div style={{ maxWidth: '680px', margin: '0 auto' }}>
      <div className="page-header">
        <h2>📋 Section Entry Exam</h2>
        <p className="text-muted text-sm">
          Complete this assessment to unlock lectures in <strong>{section.name}</strong>.
          Your answers help the AI personalise explanations for your level.
        </p>
      </div>

      {error && <div className="alert alert-error mb-2">{error}</div>}

      {questions.map((q, i) => (
        <div key={i} className="card mb-2" style={{ animation: 'fadeUp 0.3s ease', animationDelay: `${i * 0.07}s`, animationFillMode: 'both' }}>
          <div className="flex justify-between items-center mb-1">
            <span className="fw-600 text-sm" style={{ color: 'var(--accent)' }}>Question {i + 1} of {questions.length}</span>
          </div>
          <p style={{ marginBottom: '0.75rem', lineHeight: 1.6 }}>{q.question}</p>
          <textarea
            className="form-control"
            rows={3}
            placeholder="Type your answer here..."
            value={answers[i]}
            onChange={e => setAnswers(a => a.map((v, idx) => idx === i ? e.target.value : v))}
          />
        </div>
      ))}

      <div className="flex gap-1 mt-2">
        <button className="btn btn-secondary" onClick={onSkip}>
          Skip for now
        </button>
        <button
          className="btn btn-primary"
          style={{ marginLeft: 'auto' }}
          disabled={submitting || answers.some(a => !a.trim())}
          onClick={submit}
        >
          {submitting ? <span className="spinner" /> : '🚀 Submit Answers'}
        </button>
      </div>
    </div>
  );
}
