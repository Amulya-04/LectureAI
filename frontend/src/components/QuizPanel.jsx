import { useState } from 'react';
import { lectureAPI, sectionAPI } from '../api/client';

export default function QuizPanel({ lectureTitle, userLevel, onScored, sectionId }) {
  const [numQ, setNumQ] = useState(5);
  const [quiz, setQuiz] = useState([]);
  const [selected, setSelected] = useState({});
  const [revealed, setRevealed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [score, setScore] = useState(null);

  const generate = async () => {
    setLoading(true); setQuiz([]); setSelected({}); setRevealed(false); setScore(null);
    try {
      const { data } = sectionId
        ? await sectionAPI.quiz(sectionId, lectureTitle, numQ)
        : await lectureAPI.quiz(lectureTitle, numQ);
      setQuiz(data.quiz || []);
    } catch { } finally { setLoading(false); }
  };

  const select = (qi, opt) => {
    if (revealed) return;
    setSelected(s => ({ ...s, [qi]: opt }));
  };

  const submit = () => {
    if (Object.keys(selected).length < quiz.length) return;
    setRevealed(true);
    const correct = quiz.filter((q, i) => selected[i] === q.answer).length;
    const pct = Math.round((correct / quiz.length) * 100);
    setScore({ correct, total: quiz.length, pct });
    onScored(pct);
  };

  const optClass = (qi, opt) => {
    if (!revealed) return selected[qi] === opt ? 'quiz-opt selected' : 'quiz-opt';
    if (opt === quiz[qi].answer) return 'quiz-opt correct';
    if (selected[qi] === opt) return 'quiz-opt wrong';
    return 'quiz-opt';
  };

  return (
    <div>
      {quiz.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '2.5rem' }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🧠</div>
          <h3 className="fw-700 mb-1">Generate a Quiz</h3>
          <p className="text-muted text-sm mb-2">Questions will be personalised for your <strong>{userLevel}</strong> level.</p>
          <div className="flex items-center justify-between" style={{ background: 'var(--bg3)', borderRadius: 'var(--radius-sm)', padding: '0.75rem 1rem', marginBottom: '1rem' }}>
            <span className="text-sm fw-600">Number of questions</span>
            <div className="flex items-center gap-1">
              <button className="btn btn-secondary btn-sm" onClick={() => setNumQ(n => Math.max(3, n - 1))}>−</button>
              <span className="fw-700" style={{ minWidth: '2ch', textAlign: 'center' }}>{numQ}</span>
              <button className="btn btn-secondary btn-sm" onClick={() => setNumQ(n => Math.min(10, n + 1))}>+</button>
            </div>
          </div>
          <button className="btn btn-primary btn-full" onClick={generate} disabled={loading}>
            {loading ? <><span className="spinner" /> Generating…</> : '🚀 Generate Quiz'}
          </button>
        </div>
      ) : (
        <div>
          {score && (
            <div className={`card mb-2 ${score.pct >= 75 ? 'alert-success' : score.pct >= 40 ? 'alert-info' : 'alert-error'}`}
              style={{ textAlign: 'center', padding: '1.5rem' }}>
              <div style={{ fontSize: '2rem', fontWeight: 900, color: score.pct >= 75 ? 'var(--green)' : score.pct >= 40 ? 'var(--yellow)' : 'var(--red)' }}>
                {score.correct}/{score.total}
              </div>
              <div className="fw-600 mt-1">{score.pct}% — {score.pct >= 75 ? '🏆 Excellent!' : score.pct >= 40 ? '🔶 Good effort!' : '🌱 Keep practising!'}</div>
              <div className="text-xs text-muted mt-1">Your level score has been updated.</div>
              <button className="btn btn-secondary btn-sm mt-2" onClick={generate}>Try another quiz</button>
            </div>
          )}

          {quiz.map((q, qi) => (
            <div key={qi} className="quiz-question card mb-2">
              <div className="quiz-q">Q{qi + 1}. {q.question}</div>
              <div className="quiz-options">
                {q.options.map(opt => (
                  <button key={opt} className={optClass(qi, opt)} onClick={() => select(qi, opt)}>{opt}</button>
                ))}
              </div>
              {revealed && q.explanation && (
                <div className="text-xs text-muted mt-1" style={{ borderTop: '1px solid var(--card-border)', paddingTop: '0.5rem' }}>
                  💡 {q.explanation}
                </div>
              )}
            </div>
          ))}

          {!revealed && (
            <button className="btn btn-primary btn-full" onClick={submit}
              disabled={Object.keys(selected).length < quiz.length}>
              ✅ Submit Quiz ({Object.keys(selected).length}/{quiz.length} answered)
            </button>
          )}
        </div>
      )}
    </div>
  );
}
