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

  const handleExportPDF = () => {
    if (!score) return;
    const printWindow = window.open('', '_blank', 'width=800,height=1000');
    if (!printWindow) {
      alert('Please allow popups to export the PDF');
      return;
    }

    const scoreColor = score.pct >= 75 ? '#10b981' : score.pct >= 40 ? '#f59e0b' : '#ef4444';
    const scoreBg = score.pct >= 75 ? 'rgba(16, 185, 129, 0.05)' : score.pct >= 40 ? 'rgba(245, 158, 11, 0.05)' : 'rgba(239, 68, 68, 0.05)';
    const scoreText = score.pct >= 75 ? '🏆 Excellent!' : score.pct >= 40 ? '🔶 Good effort!' : '🌱 Keep practising!';

    const questionsHTML = quiz.map((q, i) => {
      const userAns = selected[i];
      const isCorrect = userAns === q.answer;

      const optionsHTML = q.options.map(opt => {
        let marker = '';
        let itemClass = '';
        if (opt === q.answer) {
          marker = ' <span class="correct-marker">✓ Correct</span>';
          itemClass = 'opt-correct';
        } else if (opt === userAns) {
          marker = ' <span class="wrong-marker">✗ Selected</span>';
          itemClass = 'opt-wrong';
        }
        return `<li class="${itemClass}">${opt}${marker}</li>`;
      }).join('');

      return `
        <div class="question-block">
          <div class="question-title">Q${i + 1}. ${q.question}</div>
          <ul class="options-list">${optionsHTML}</ul>
          ${q.explanation ? `<div class="explanation-box">💡 <strong>Explanation:</strong> ${q.explanation}</div>` : ''}
        </div>
      `;
    }).join('');

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Quiz Results - ${lectureTitle || 'Lecture Quiz'}</title>
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">
        <style>
          body {
            font-family: 'Inter', sans-serif;
            color: #1f2937;
            line-height: 1.6;
            margin: 0;
            padding: 40px;
            background: #fff;
          }
          .header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            border-bottom: 2px solid #e5e7eb;
            padding-bottom: 20px;
            margin-bottom: 30px;
          }
          .logo {
            font-size: 24px;
            font-weight: 800;
            color: #8b5cf6;
          }
          .badge {
            background: rgba(139, 92, 246, 0.1);
            color: #8b5cf6;
            padding: 6px 12px;
            border-radius: 9999px;
            font-size: 12px;
            font-weight: 600;
          }
          h1 {
            font-size: 26px;
            font-weight: 800;
            margin: 0 0 10px 0;
            color: #111827;
          }
          .meta {
            font-size: 14px;
            color: #6b7280;
            margin-bottom: 25px;
          }
          .score-card {
            background: ${scoreBg};
            border: 1px solid ${scoreColor}40;
            border-radius: 12px;
            padding: 24px;
            text-align: center;
            margin-bottom: 35px;
          }
          .score-num {
            font-size: 40px;
            font-weight: 900;
            color: ${scoreColor};
            margin: 0;
          }
          .score-label {
            font-size: 18px;
            font-weight: 700;
            margin: 5px 0;
          }
          .score-desc {
            font-size: 13px;
            color: #6b7280;
          }
          .question-block {
            margin-bottom: 30px;
            page-break-inside: avoid;
            border-bottom: 1px solid #f3f4f6;
            padding-bottom: 25px;
          }
          .question-title {
            font-size: 16px;
            font-weight: 700;
            color: #111827;
            margin-bottom: 12px;
          }
          .options-list {
            list-style: none;
            padding: 0;
            margin: 0 0 15px 0;
          }
          .options-list li {
            padding: 8px 12px;
            margin-bottom: 6px;
            border-radius: 6px;
            background: #f9fafb;
            font-size: 14px;
            border: 1px solid #e5e7eb;
          }
          .options-list li.opt-correct {
            border-color: #10b981;
            background: rgba(16, 185, 129, 0.05);
            font-weight: 500;
          }
          .options-list li.opt-wrong {
            border-color: #ef4444;
            background: rgba(239, 68, 68, 0.05);
          }
          .correct-marker {
            color: #10b981;
            font-weight: 600;
            margin-left: 10px;
            font-size: 12px;
          }
          .wrong-marker {
            color: #ef4444;
            font-weight: 600;
            margin-left: 10px;
            font-size: 12px;
          }
          .explanation-box {
            background: #f3f4f6;
            padding: 12px 16px;
            border-radius: 6px;
            font-size: 13px;
            color: #4b5563;
            border-left: 3px solid #9ca3af;
          }
          .footer {
            margin-top: 50px;
            border-top: 1px solid #e5e7eb;
            padding-top: 20px;
            text-align: center;
            font-size: 12px;
            color: #9ca3af;
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="logo">🎓 LectureAI</div>
          <div class="badge">${userLevel} Level</div>
        </div>

        <h1>Quiz Results: ${lectureTitle || 'Lecture Quiz'}</h1>
        <div class="meta">Completed on ${new Date().toLocaleDateString()}</div>

        <div class="score-card">
          <div class="score-num">${score.correct} / ${score.total}</div>
          <div class="score-label" style="color: ${scoreColor}">${score.pct}% — ${scoreText}</div>
          <div class="score-desc">Personalized AI Evaluation</div>
        </div>

        ${questionsHTML}

        <div class="footer">
          Generated automatically by LectureAI personalized learning platform.
        </div>

        <script>
          window.onload = function() {
            setTimeout(function() {
              window.print();
            }, 500);
          }
        </script>
      </body>
      </html>
    `;

    printWindow.document.write(htmlContent);
    printWindow.document.close();
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
              <div className="flex gap-1 mt-2" style={{ justifyContent: 'center' }}>
                <button className="btn btn-secondary btn-sm" onClick={generate}>Try another quiz</button>
                <button className="btn btn-secondary btn-sm" onClick={handleExportPDF}>📄 Export PDF</button>
              </div>
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
