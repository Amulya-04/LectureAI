import { useEffect } from 'react';

export default function ProfileView({ user }) {
  const {
    username = '',
    role = 'student',
    levelLabel = 'Beginner',
    levelScore = 0,
    streak = 0,
    longestStreak = 0,
    lastActiveDate = '',
    progressHistory = [],
  } = user || {};

  const levelColor =
    levelLabel === 'Beginner' ? '#06b6d4' :
    levelLabel === 'Intermediate' ? '#f59e0b' : '#10b981';

  const streakPercent = longestStreak > 0 ? Math.min(100, Math.round((streak / longestStreak) * 100)) : 0;

  // Formatting date helper
  const fmtDate = (iso) => {
    if (!iso) return 'Recent';
    try {
      const d = new Date(iso);
      return d.toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' });
    } catch {
      return iso;
    }
  };

  const reversedHistory = [...progressHistory].reverse().slice(0, 20);

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem', padding: '1rem 0' }}>
      
      {/* LEFT COLUMN: HERO, STREAK, LEVEL */}
      <div className="flex flex-col gap-2">
        
        {/* Profile Hero Card */}
        <div className="card" style={{ textAlign: 'center', padding: '2rem 1.5rem' }}>
          <div style={{
            width: 80, height: 80, borderRadius: '24px',
            background: 'linear-gradient(135deg, #8b5cf6, #06b6d4)',
            color: '#fff', fontSize: '2.2rem', fontWeight: 800,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 1.25rem',
            boxShadow: '0 8px 24px rgba(139,92,246,0.35)'
          }}>
            {username ? username[0].toUpperCase() : 'U'}
          </div>
          
          <h2 className="fw-800" style={{ fontSize: '1.6rem', margin: '0 0 0.25rem 0' }}>{username}</h2>
          
          <div className="flex gap-0.5 justify-center items-center mb-1">
            <span className="badge badge-success text-xs" style={{ background: 'rgba(16,185,129,0.1)', color: '#10b981', padding: '3px 8px' }}>
              🎓 Student
            </span>
            <span className="badge text-xs" style={{ background: `${levelColor}15`, color: levelColor, padding: '3px 8px', fontWeight: 600 }}>
              ⚡ {levelLabel} Learner
            </span>
          </div>
          
          <p className="text-xs text-muted" style={{ margin: 0 }}>
            {lastActiveDate ? `Active learner · Last studied ${fmtDate(lastActiveDate)}` : 'Active Learner'}
          </p>
        </div>

        {/* Study Streak Card */}
        <div className="card" style={{ position: 'relative', overflow: 'hidden' }}>
          <div className="fw-700 text-sm text-muted mb-1" style={{ textTransform: 'uppercase', letterSpacing: '0.05em' }}>🔥 Study Streak</div>
          <div className="flex items-center gap-1.5" style={{ margin: '1rem 0' }}>
            <div style={{
              fontSize: '3.5rem',
              animation: 'pulse 1.5s ease-in-out infinite',
              display: 'inline-block'
            }}>🔥</div>
            <div>
              <div style={{ fontSize: '2.5rem', fontWeight: 900, color: '#f59e0b', lineHeight: 1 }}>{streak}</div>
              <div className="text-xs text-muted fw-600">current day streak</div>
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-1 mb-1.5" style={{ background: 'var(--bg3)', padding: '0.75rem', borderRadius: 'var(--radius-sm)' }}>
            <div style={{ textAlign: 'center' }}>
              <div className="text-xs text-muted">Best Streak</div>
              <div className="text-sm fw-800">{longestStreak} days</div>
            </div>
            <div style={{ textAlign: 'center', borderLeft: '1px solid var(--card-border)' }}>
              <div className="text-xs text-muted">Last Active</div>
              <div className="text-sm fw-800">{lastActiveDate ? fmtDate(lastActiveDate) : 'Today'}</div>
            </div>
          </div>

          <div style={{ background: 'var(--bg3)', height: '6px', borderRadius: '3px', width: '100%', overflow: 'hidden' }}>
            <div style={{
              background: 'linear-gradient(to right, #f59e0b, #ef4444)',
              width: `${streakPercent}%`, height: '100%',
              borderRadius: '3px', transition: 'width 0.5s ease-out'
            }} />
          </div>
          <div className="text-xs text-muted mt-0.5" style={{ textAlign: 'right' }}>
            {streakPercent}% of personal best ({longestStreak}d)
          </div>
        </div>

        {/* AI Level Card */}
        <div className="card" style={{ borderLeft: `4px solid ${levelColor}`, background: 'rgba(124,110,237,0.02)' }}>
          <div className="fw-700 text-sm text-muted mb-1" style={{ textTransform: 'uppercase', letterSpacing: '0.05em' }}>🧠 Your AI Level</div>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, color: levelColor, marginBottom: '0.5rem' }}>
            {levelLabel}
          </div>
          
          {/* Level Progress Fill */}
          <div className="mb-1">
            <div className="flex justify-between text-xs mb-0.5">
              <span className="text-muted">Mastery Index</span>
              <span className="fw-700" style={{ color: levelColor }}>{Math.round(levelScore)} / 100</span>
            </div>
            <div style={{ background: 'var(--bg3)', height: '8px', borderRadius: '4px', width: '100%', overflow: 'hidden' }}>
              <div style={{
                background: `linear-gradient(to right, #8b5cf6, ${levelColor})`,
                width: `${levelScore}%`, height: '100%',
                borderRadius: '4px', transition: 'width 0.5s ease-out'
              }} />
            </div>
          </div>

          <p className="text-xs text-muted mb-1" style={{ lineHeight: 1.5 }}>
            Based on cumulative quiz scores and section performance. Explanations and quizzes are dynamically calibrated to your performance.
          </p>

          <div className="flex gap-0.5 mt-1" style={{ borderTop: '1px solid var(--card-border)', paddingTop: '0.75rem' }}>
            {['Beginner', 'Intermediate', 'Advanced'].map(lbl => {
              const active = levelLabel === lbl;
              return (
                <div key={lbl} style={{
                  flex: 1, textAlign: 'center', padding: '6px', borderRadius: '6px',
                  fontSize: '0.7rem', fontWeight: 700,
                  background: active ? levelColor : 'var(--bg3)',
                  color: active ? '#fff' : 'var(--text-muted)',
                  border: active ? 'none' : '1px dashed var(--card-border)',
                  boxShadow: active ? '0 4px 10px rgba(0,0,0,0.1)' : 'none'
                }}>
                  {lbl}
                </div>
              );
            })}
          </div>
        </div>

      </div>

      {/* RIGHT COLUMN: LEARNING HISTORY TIMELINE */}
      <div className="card" style={{ display: 'flex', flexDirection: 'column' }}>
        <h3 className="fw-800 text-base mb-1">📅 Learning History</h3>
        <p className="text-xs text-muted mb-2">Track your learning journey and quiz progress across subjects.</p>
        
        <div style={{ flex: 1, overflowY: 'auto', maxH: '580px', paddingRight: '6px' }}>
          {reversedHistory.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '3.5rem 1rem' }}>
              <div style={{ fontSize: '3.5rem', marginBottom: '1rem' }}>📚</div>
              <h4 className="fw-700 mb-0.5">No activity logged yet</h4>
              <p className="text-sm text-muted">Generate a quiz, complete an assessment, or upload a lecture to build your progress timeline.</p>
            </div>
          ) : (
            <div style={{ position: 'relative', paddingLeft: '1.5rem', borderLeft: '2px solid var(--card-border)', marginLeft: '0.75rem', marginTop: '0.5rem' }}>
              {reversedHistory.map((item, idx) => {
                const isQuiz = item.type === 'quiz' || (!item.type && item.score !== undefined);
                const scoreVal = item.score ?? 0;
                
                // Color mapping for score
                const scoreColor = scoreVal >= 75 ? '#10b981' : scoreVal >= 40 ? '#f59e0b' : '#ef4444';
                const scoreText = scoreVal !== undefined ? `${scoreVal}%` : '';

                // Title details
                const titleText = isQuiz ? `Quiz - ${item.lectureTitle || 'Practice'}` : 'Initial Evaluation Exam';

                return (
                  <div key={idx} className="timeline-item" style={{
                    position: 'relative', marginBottom: '1.25rem',
                    animation: 'fadeUp 0.4s ease-out both',
                    animationDelay: `${idx * 0.05}s`
                  }}>
                    {/* Circle Indicator on timeline */}
                    <div style={{
                      position: 'absolute', left: '-1.95rem', top: '4px',
                      width: 12, height: 12, borderRadius: '50%',
                      background: isQuiz ? '#8b5cf6' : '#06b6d4',
                      border: '3px solid var(--card-bg)',
                      boxShadow: '0 0 0 2px var(--card-border)'
                    }} />

                    <div className="card" style={{ padding: '0.75rem', background: 'var(--bg3)', border: '1px solid var(--card-border)', marginBottom: 0 }}>
                      <div className="flex justify-between items-start mb-0.5">
                        <span className="text-xxs text-muted fw-600" style={{ textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                          {isQuiz ? '🧠 Practice Quiz' : '📝 Level Assessment'}
                        </span>
                        <span className="text-xxs text-muted">{fmtDate(item.date)}</span>
                      </div>
                      
                      <div className="text-xs fw-700 mb-0.5">{titleText}</div>
                      
                      {scoreText && (
                        <div className="flex items-center gap-0.5 text-xs">
                          <span className="text-muted">Result:</span>
                          <strong style={{ color: scoreColor }}>{scoreText}</strong>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <style>{`
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(12px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
