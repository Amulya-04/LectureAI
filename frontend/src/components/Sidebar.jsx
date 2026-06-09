import { useState } from 'react';

export default function Sidebar({
  user, sections, notifications, activeSection, activeLecture,
  onSelectSection, onSelectLecture, onBrowse, onLogout,
  onProfile, onPersonalWorkspace, activeView
}) {
  const [expandedSection, setExpandedSection] = useState(activeSection?.id || null);

  const toggleSection = (sec) => {
    if (expandedSection === sec.id) {
      setExpandedSection(null);
    } else {
      setExpandedSection(sec.id);
      onSelectSection(sec);
    }
  };

  const streakColor = user.streak >= 7 ? '#f59e0b' : user.streak >= 3 ? '#34d399' : '#60a5fa';

  return (
    <div className="sidebar">
      {/* Header */}
      <div className="sidebar-header">
        <div className="sidebar-logo">🎓 LectureAI</div>
        <div className="text-xs text-muted mt-1">Student Dashboard</div>
      </div>

      {/* User Info */}
      <div className="sidebar-user" onClick={onProfile} style={{ cursor: 'pointer' }}>
        <div className="avatar">{user.username[0].toUpperCase()}</div>
        <div className="sidebar-user-info">
          <div className="sidebar-username">{user.username}</div>
          <div className="sidebar-role" style={{ color: 'var(--accent)' }}>
            {user.levelLabel || 'Beginner'}
          </div>
        </div>
      </div>

      {/* Streak Card */}
      <div className="streak-card" onClick={onProfile} style={{ cursor: 'pointer' }}>
        <div className="streak-flame" style={{ color: streakColor }}>
          {user.streak >= 7 ? '🔥' : user.streak >= 3 ? '⚡' : '✨'}
        </div>
        <div className="streak-info">
          <div className="streak-number" style={{ color: streakColor }}>{user.streak || 0}</div>
          <div className="streak-label">day streak</div>
        </div>
        <div className="streak-best">
          <div className="text-xs text-muted">Best</div>
          <div className="streak-best-num">{user.longestStreak || 0}</div>
        </div>
      </div>

      {/* Navigation Buttons */}
      <div style={{ padding: '0 1rem', marginTop: '0.5rem', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
        <button 
          className={`btn btn-full btn-sm ${activeView === 'browse' ? 'btn-primary' : 'btn-secondary'}`} 
          onClick={onBrowse}
        >
          🔍 Browse Subjects
        </button>
        <button 
          className={`btn btn-full btn-sm ${activeView === 'profile' ? 'btn-primary' : 'btn-secondary'}`} 
          onClick={onProfile}
        >
          👤 My Profile
        </button>
        <button 
          className={`btn btn-full btn-sm ${activeView === 'workspace' ? 'btn-primary' : 'btn-secondary'}`} 
          onClick={onPersonalWorkspace}
        >
          📁 Personal Study
        </button>
      </div>

      {/* Enrolled Sections */}
      <div className="sidebar-sections">
        <div className="sidebar-section-label">MY SECTIONS</div>
        {sections.length === 0 && (
          <div className="text-xs text-muted" style={{ padding: '0.5rem 1rem' }}>
            No sections yet. Browse & enroll!
          </div>
        )}
        {sections.map(sec => {
          const notifCount = notifications[sec.id] || 0;
          const isExpanded = expandedSection === sec.id;
          const isActive = activeSection?.id === sec.id && activeView === 'section';

          return (
            <div key={sec.id} className="sidebar-section-group">
              <button
                className={`sidebar-section-btn${isActive ? ' active' : ''}`}
                onClick={() => toggleSection(sec)}
              >
                <span className="sidebar-section-icon">📚</span>
                <span className="sidebar-section-name">{sec.name}</span>
                {notifCount > 0 && (
                  <span className="notif-badge">{notifCount}</span>
                )}
                <span className="sidebar-chevron">{isExpanded ? '▾' : '▸'}</span>
              </button>

              {isExpanded && activeSection?.id === sec.id && activeSection.lectures && (
                <div className="sidebar-lectures">
                  {activeSection.lectures.length === 0 && (
                    <div className="text-xs text-muted" style={{ padding: '0.3rem 1rem 0.3rem 2.5rem' }}>
                      No lectures yet
                    </div>
                  )}
                  {activeSection.lectures.map(lec => (
                    <button
                      key={lec.title}
                      className={`sidebar-lecture-btn${activeLecture === lec.title && activeView === 'lecture' ? ' active' : ''}`}
                      onClick={() => onSelectLecture(lec.title)}
                    >
                      🎙️ {lec.title}
                    </button>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Bottom */}
      <div className="sidebar-bottom">
        <div className="text-xs text-muted mb-1" style={{ textAlign: 'center' }}>
          Level: <strong>{user.levelLabel}</strong> · Score: {Math.round(user.levelScore || 0)}
        </div>
        <button className="btn btn-danger btn-full btn-sm" onClick={onLogout}>🚪 Logout</button>
      </div>
    </div>
  );
}
