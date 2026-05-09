import { useState, useEffect } from 'react';
import { sectionAPI, userAPI } from '../api/client';
import SectionExam from './SectionExam';
import Sidebar from '../components/Sidebar';
import SummaryView from '../components/SummaryView';
import ChatBox from '../components/ChatBox';
import QuizPanel from '../components/QuizPanel';

export default function Dashboard({ user, onLogout, onUpdateUser }) {
  const [sections, setSections] = useState([]);
  const [allSections, setAllSections] = useState([]);
  const [profile, setProfile] = useState(user);
  const [view, setView] = useState('browse'); // 'browse' | 'section' | 'exam' | 'lecture'
  const [activeSection, setActiveSection] = useState(null);
  const [activeLecture, setActiveLecture] = useState(null);
  const [lectureData, setLectureData] = useState(null);
  const [notifications, setNotifications] = useState({});
  const [tab, setTab] = useState('summary');
  const [loading, setLoading] = useState(false);

  useEffect(() => { fetchAll(); }, []);

  const fetchAll = async () => {
    try {
      const { data } = await sectionAPI.list();
      setAllSections(data);
      const enrolled = data.filter(s => s.isEnrolled);
      setSections(enrolled);
      // Fetch notification counts for enrolled sections
      enrolled.forEach(async (s) => {
        try {
          const { data: notifs } = await sectionAPI.getNotifications(s.id);
          setNotifications(prev => ({ ...prev, [s.id]: notifs.length }));
        } catch {}
      });
    } catch {}
  };

  const fetchProfile = async () => {
    try {
      const { data } = await userAPI.profile();
      setProfile(data);
      onUpdateUser(data);
    } catch {}
  };

  const handleEnroll = async (sectionId) => {
    try {
      await sectionAPI.enroll(sectionId);
      await fetchAll();
      const { data: sec } = await sectionAPI.get(sectionId);
      setActiveSection(sec);
      if (sec.hasExam && !sec.isAssessed) {
        setView('exam');
      } else {
        setView('section');
      }
    } catch (e) {
      alert(e.response?.data?.error || 'Failed to enroll.');
    }
  };

  const openSection = async (sec) => {
    setLoading(true);
    try {
      const { data } = await sectionAPI.get(sec.id);
      setActiveSection(data);
      setActiveLecture(null);
      setLectureData(null);
      if (data.hasExam && !data.isAssessed) {
        setView('exam');
      } else {
        setView('section');
      }
      // Clear notification count
      setNotifications(prev => ({ ...prev, [sec.id]: 0 }));
    } catch {} finally { setLoading(false); }
  };

  const onExamComplete = async (result) => {
    await fetchProfile();
    await fetchAll();
    const { data } = await sectionAPI.get(activeSection.id);
    setActiveSection(data);
    setView('section');
  };

  const loadLecture = async (title) => {
    setLoading(true); setTab('summary');
    try {
      const { data } = await sectionAPI.getLecture(activeSection.id, title);
      setLectureData(data);
      setActiveLecture(title);
      setView('lecture');
    } catch {} finally { setLoading(false); }
  };

  const onQuizScored = async (score) => {
    await userAPI.updateProgress(score);
    fetchProfile();
  };

  const lectureTabs = [
    { id: 'summary', label: '📋 Summary' },
    { id: 'chat', label: '💬 Ask AI' },
    { id: 'quiz', label: '🧠 Quiz' },
  ];

  return (
    <div className="app-layout">
      <Sidebar
        user={profile}
        sections={sections}
        notifications={notifications}
        activeSection={activeSection}
        activeLecture={activeLecture}
        onSelectSection={openSection}
        onSelectLecture={loadLecture}
        onBrowse={() => { setView('browse'); setActiveSection(null); setActiveLecture(null); }}
        onLogout={onLogout}
      />

      <div className="main-content">
        {/* ── BROWSE / HOME ────────────────────────────────────────── */}
        {view === 'browse' && (
          <>
            <div className="page-header">
              <h2>🎓 Browse Subjects</h2>
              <p className="text-muted text-sm">Join a subject section to access lectures from your teachers</p>
            </div>
            {allSections.length === 0 && (
              <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
                <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📚</div>
                <p className="text-muted">No sections available yet. Ask your faculty to create one.</p>
              </div>
            )}
            <div className="sections-grid">
              {allSections.map(s => (
                <div key={s.id} className={`section-browse-card${s.isEnrolled ? ' enrolled' : ''}`}>
                  <div className="section-card-header">
                    <div className="section-card-icon">📖</div>
                    <div className="section-card-badge">
                      {s.isEnrolled ? (
                        <span className="badge badge-success">✓ Enrolled</span>
                      ) : (
                        <span className="badge badge-neutral">Not Enrolled</span>
                      )}
                    </div>
                  </div>
                  <h3 className="section-card-title">{s.name}</h3>
                  <div className="section-card-meta">
                    <span>👩‍🏫 {s.faculty}</span>
                    <span>👥 {s.studentCount} students</span>
                    <span>📝 {s.lectureCount} lectures</span>
                    {s.hasExam && <span>📋 Has exam</span>}
                  </div>
                  {s.isEnrolled ? (
                    <button className="btn btn-primary btn-full mt-2" onClick={() => openSection(s)}>
                      {notifications[s.id] > 0 ? `🔔 Open (${notifications[s.id]} new)` : '📖 Open Section'}
                    </button>
                  ) : (
                    <button className="btn btn-secondary btn-full mt-2" onClick={() => handleEnroll(s.id)}>
                      ➕ Enroll
                    </button>
                  )}
                </div>
              ))}
            </div>
          </>
        )}

        {/* ── SECTION EXAM ─────────────────────────────────────────── */}
        {view === 'exam' && activeSection && (
          <SectionExam
            section={activeSection}
            onComplete={onExamComplete}
            onSkip={() => setView('section')}
          />
        )}

        {/* ── SECTION LECTURES LIST ─────────────────────────────────── */}
        {view === 'section' && activeSection && (
          <>
            <div className="page-header">
              <h2>📚 {activeSection.name}</h2>
              <p className="text-muted text-sm">👩‍🏫 {activeSection.faculty} · {activeSection.lectures?.length || 0} lecture(s)</p>
            </div>
            {!activeSection.lectures || activeSection.lectures.length === 0 ? (
              <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
                <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🎙️</div>
                <p className="text-muted">No lectures uploaded yet. Check back soon!</p>
              </div>
            ) : (
              <div className="lectures-list">
                {activeSection.lectures.map((lec, i) => (
                  <div key={lec.title} className="lecture-list-item" style={{ animationDelay: `${i * 0.05}s` }}>
                    <div className="lecture-list-icon">🎙️</div>
                    <div className="lecture-list-info">
                      <div className="lecture-list-title">{lec.title}</div>
                      <div className="lecture-list-meta">
                        {lec.wordCount?.toLocaleString()} words · {new Date(lec.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </div>
                    </div>
                    <button className="btn btn-primary btn-sm" onClick={() => loadLecture(lec.title)}>
                      Open →
                    </button>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* ── LECTURE VIEW ─────────────────────────────────────────── */}
        {view === 'lecture' && lectureData && (
          <>
            <div className="page-header flex justify-between items-center">
              <div>
                <button className="btn btn-sm btn-secondary mb-1" onClick={() => setView('section')}>← Back</button>
                <h2>📖 {activeLecture}</h2>
                <p className="text-muted text-sm">
                  {lectureData.wordCount?.toLocaleString()} words · personalised for {profile.levelLabel}
                </p>
              </div>
            </div>
            {loading ? (
              <div className="spinner-center"><div className="spinner spinner-lg" /></div>
            ) : (
              <>
                <div className="tabs mb-2">
                  {lectureTabs.map(t => (
                    <button key={t.id} className={`tab-btn${tab === t.id ? ' active' : ''}`} onClick={() => setTab(t.id)}>{t.label}</button>
                  ))}
                </div>
                {tab === 'summary' && <SummaryView lecture={lectureData} userLevel={profile.levelLabel} activeLecture={activeLecture} />}
                {tab === 'chat' && <ChatBox sectionId={activeSection.id} lectureTitle={activeLecture} userLevel={profile.levelLabel} />}
                {tab === 'quiz' && <QuizPanel sectionId={activeSection.id} lectureTitle={activeLecture} userLevel={profile.levelLabel} onScored={onQuizScored} />}
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}
