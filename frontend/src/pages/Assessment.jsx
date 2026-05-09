import { useState, useEffect } from 'react';
import { examAPI, userAPI } from '../api/client';

export default function Assessment({ user, onComplete }) {
  const [questions, setQuestions] = useState([]);
  const [answers, setAnswers] = useState([]);
  const [current, setCurrent] = useState(0);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    examAPI.getQuestions()
      .then(({ data }) => { setQuestions(data); setAnswers(Array(data.length).fill('')); })
      .catch(() => setError('Could not load exam questions. Please ask your faculty to set them up.'))
      .finally(() => setLoading(false));
  }, []);

  const setAnswer = (val) => {
    const a = [...answers]; a[current] = val; setAnswers(a);
  };

  const submit = async () => {
    setSubmitting(true);
    try {
      const { data } = await examAPI.assess(answers);
      setResult(data);
      // Sync updated profile
      const profile = await userAPI.profile();
      onComplete(profile.data);
    } catch (e) {
      setError(e.response?.data?.error || 'Assessment failed.');
    } finally { setSubmitting(false); }
  };

  const levelColor = (label) => ({ Beginner: '#22d3ee', Intermediate: '#fbbf24', Advanced: '#34d399' }[label] || '#7c6eed');

  if (loading) return (
    <div className="assess-page"><div className="assess-card"><div className="spinner-center"><div className="spinner spinner-lg" /></div></div></div>
  );

  if (error && !questions.length) return (
    <div className="assess-page">
      <div className="assess-card">
        <div className="assess-header"><div style={{ fontSize: '3rem' }}>📋</div><h2>Assessment Pending</h2></div>
        <div className="alert alert-info">{error}</div>
      </div>
    </div>
  );

  if (result) return (
    <div className="assess-page">
      <div className="assess-card" style={{ textAlign: 'center' }}>
        <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>🎉</div>
        <h2 style={{ fontSize: '1.8rem', fontWeight: 800, marginBottom: '0.5rem' }}>Assessment Complete!</h2>
        <p className="text-muted mb-2">Here's how you scored on the initial assessment:</p>

        <div style={{ margin: '1.5rem 0', padding: '1.5rem', background: 'var(--bg3)', borderRadius: 'var(--radius)', border: '1px solid var(--card-border)' }}>
          <div style={{ fontSize: '3rem', fontWeight: 900, color: levelColor(result.levelLabel || 'Beginner') }}>{result.score}<span style={{ fontSize: '1.5rem' }}>/100</span></div>
          <div style={{ marginTop: '0.5rem', fontSize: '1.1rem', fontWeight: 700, color: levelColor(result.levelLabel || 'Beginner') }}>
            {result.score >= 75 ? '⭐ Advanced' : result.score >= 40 ? '🔶 Intermediate' : '🌱 Beginner'}
          </div>
        </div>

        {result.feedback && <p className="text-muted text-sm mb-2" style={{ fontStyle: 'italic' }}>"{result.feedback}"</p>}

        <div className="progress-bar mb-2">
          <div className="progress-fill" style={{ width: `${result.score}%`, background: `linear-gradient(90deg, ${levelColor('Beginner')}, ${levelColor('Advanced')})` }} />
        </div>

        <p className="text-sm text-muted mb-2">The AI will now personalise all explanations to your level. Your level will grow as you learn! 🚀</p>
        <button className="btn btn-primary btn-full" onClick={() => window.location.reload()}>Enter LectureAI →</button>
      </div>
    </div>
  );

  const q = questions[current];
  const allAnswered = answers.every(a => a.trim());

  return (
    <div className="assess-page">
      <div className="assess-card">
        <div className="assess-header">
          <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>📝</div>
          <h2>Initial Assessment</h2>
          <p>Answer honestly — this helps the AI tune explanations perfectly for you.</p>
        </div>

        <div className="question-counter">
          {questions.map((_, i) => (
            <div key={i} className={`q-dot ${i < current ? 'done' : i === current ? 'current' : ''}`} />
          ))}
        </div>

        {error && <div className="alert alert-error">{error}</div>}

        <div className="card mb-2">
          <div className="flex justify-between items-center mb-1">
            <span className="text-xs text-muted">Question {current + 1} of {questions.length}</span>
          </div>
          <p className="fw-600 mb-2" style={{ lineHeight: 1.6 }}>{q?.question}</p>
          <textarea
            className="form-control"
            rows={4}
            placeholder="Type your answer here..."
            value={answers[current] || ''}
            onChange={e => setAnswer(e.target.value)}
          />
        </div>

        <div className="flex gap-1">
          {current > 0 && (
            <button className="btn btn-secondary" onClick={() => setCurrent(c => c - 1)}>← Back</button>
          )}
          {current < questions.length - 1 ? (
            <button className="btn btn-primary" style={{ marginLeft: 'auto' }} onClick={() => setCurrent(c => c + 1)} disabled={!answers[current]?.trim()}>
              Next →
            </button>
          ) : (
            <button className="btn btn-primary" style={{ marginLeft: 'auto' }} onClick={submit} disabled={!allAnswered || submitting}>
              {submitting ? <span className="spinner" /> : '✅ Submit Assessment'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
