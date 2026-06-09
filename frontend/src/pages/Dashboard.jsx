import { useState, useEffect } from 'react';
import { sectionAPI, userAPI, lectureAPI } from '../api/client';
import SectionExam from './SectionExam';
import Sidebar from '../components/Sidebar';
import SummaryView from '../components/SummaryView';
import ChatBox from '../components/ChatBox';
import QuizPanel from '../components/QuizPanel';
import ProfileView from '../components/ProfileView';
import VoiceRecorder from '../components/VoiceRecorder';

export default function Dashboard({ user, onLogout, onUpdateUser }) {
  const [sections, setSections] = useState([]);
  const [allSections, setAllSections] = useState([]);
  const [profile, setProfile] = useState(user);
  const [view, setView] = useState('browse'); // 'browse' | 'section' | 'exam' | 'lecture' | 'profile' | 'workspace'
  const [activeSection, setActiveSection] = useState(null);
  const [activeLecture, setActiveLecture] = useState(null);
  const [lectureData, setLectureData] = useState(null);
  const [notifications, setNotifications] = useState({});
  const [tab, setTab] = useState('summary');
  const [loading, setLoading] = useState(false);

  // Personal Study Workspace states
  const [personalLectures, setPersonalLectures] = useState([]);
  const [workspaceMode, setWorkspaceMode] = useState('upload'); // 'upload' | 'record'
  const [personalTitle, setPersonalTitle] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);
  const [dragActive, setDragActive] = useState(false);
  const [processingWorkspace, setProcessingWorkspace] = useState(false);
  const [workspaceProgress, setWorkspaceProgress] = useState('');
  const [workspaceError, setWorkspaceError] = useState('');

  useEffect(() => { 
    fetchAll(); 
    fetchPersonalLectures();
  }, []);

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

  const fetchPersonalLectures = async () => {
    try {
      const { data } = await lectureAPI.list();
      setPersonalLectures(data || []);
    } catch (e) {
      console.error('Failed to load personal lectures', e);
    }
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

  const loadPersonalLecture = async (title) => {
    setLoading(true); setTab('summary');
    try {
      const { data } = await lectureAPI.get(title);
      setLectureData(data);
      setActiveLecture(title);
      setActiveSection(null); // Indicates personal workspace
      setView('lecture');
    } catch {} finally { setLoading(false); }
  };

  const handleDeletePersonalLecture = async (title) => {
    if (!confirm(`Are you sure you want to delete "${title}"?`)) return;
    try {
      await lectureAPI.delete(title);
      fetchPersonalLectures();
    } catch (e) {
      alert('Failed to delete lecture');
    }
  };

  const onQuizScored = async (score) => {
    await userAPI.updateProgress(score);
    fetchProfile();
  };

  const handleFileSelect = (file) => {
    if (!file) return;
    setSelectedFile(file);
    if (!personalTitle) {
      const cleanName = file.name.replace(/\.[^.]+$/, '').replace(/[-_]/g, ' ');
      setPersonalTitle(cleanName);
    }
  };

  const handleRecordReady = (file, blobUrl) => {
    setSelectedFile(file);
    if (!personalTitle) {
      const timestamp = new Date().toLocaleString();
      setPersonalTitle(`Recorded Lecture - ${timestamp}`);
    }
  };

  const processWorkspaceLecture = async () => {
    if (!selectedFile || !personalTitle.trim()) return;
    setWorkspaceError('');
    setProcessingWorkspace(true);

    const steps = [
      '🎵 Uploading media file...',
      '📝 Transcribing with Groq Whisper...',
      '🧠 personalising summary for your level...',
      '✅ Finalising processing...'
    ];
    let stepIndex = 0;
    setWorkspaceProgress(steps[stepIndex]);
    const timer = setInterval(() => {
      stepIndex = Math.min(stepIndex + 1, steps.length - 1);
      setWorkspaceProgress(steps[stepIndex]);
    }, 4500);

    try {
      const fd = new FormData();
      fd.append('audio', selectedFile);
      fd.append('title', personalTitle.trim());

      const { data } = await lectureAPI.upload(fd);
      
      clearInterval(timer);
      setWorkspaceProgress('✅ Done!');
      
      setTimeout(() => {
        setSelectedFile(null);
        setPersonalTitle('');
        setWorkspaceProgress('');
        setProcessingWorkspace(false);
        fetchPersonalLectures();
        loadPersonalLecture(data.lecture.title);
      }, 800);
    } catch (e) {
      clearInterval(timer);
      setWorkspaceError(e.response?.data?.error || 'Failed to upload and process media.');
      setProcessingWorkspace(false);
      setWorkspaceProgress('');
    }
  };

  const clearWorkspaceForm = () => {
    setSelectedFile(null);
    setPersonalTitle('');
    setWorkspaceError('');
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
        onProfile={() => { setView('profile'); setActiveSection(null); setActiveLecture(null); fetchProfile(); }}
        onPersonalWorkspace={() => { setView('workspace'); setActiveSection(null); setActiveLecture(null); fetchPersonalLectures(); }}
        activeView={view}
        onLogout={onLogout}
      />

      <div className="main-content">
        {/* ── MY PROFILE VIEW ──────────────────────────────────────── */}
        {view === 'profile' && (
          <>
            <div className="page-header">
              <h2>👤 My Profile</h2>
              <p className="text-muted text-sm">Personalised stats, study streaks, and assessment history</p>
            </div>
            <ProfileView user={profile} />
          </>
        )}

        {/* ── PERSONAL STUDY WORKSPACE ──────────────────────────────── */}
        {view === 'workspace' && (
          <>
            <div className="page-header">
              <h2>📁 Personal Study Workspace</h2>
              <p className="text-muted text-sm">Upload or record your own personal lectures, study notes, or meeting audio to process with the AI Tutor.</p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem' }}>
              
              {/* Left Column: File upload & recording */}
              <div className="flex flex-col gap-2">
                <div className="card">
                  <h3 className="fw-800 mb-1" style={{ fontSize: '1.2rem', display: 'flex', alignItems: 'center', gap: 6 }}>
                    📥 Process New Material
                  </h3>
                  
                  {/* Mode Toggles */}
                  <div className="tabs mb-2" style={{ display: 'flex', gap: '0.25rem', padding: '0.2rem', background: 'var(--bg3)', borderRadius: '8px' }}>
                    <button 
                      className={`tab-btn`} 
                      style={{ flex: 1, padding: '0.4rem', fontSize: '0.8rem', background: workspaceMode === 'upload' ? 'var(--card-bg)' : 'transparent', border: 'none', borderRadius: '6px' }}
                      onClick={() => { setWorkspaceMode('upload'); clearWorkspaceForm(); }}
                    >
                      ☁️ Upload File
                    </button>
                    <button 
                      className={`tab-btn`} 
                      style={{ flex: 1, padding: '0.4rem', fontSize: '0.8rem', background: workspaceMode === 'record' ? 'var(--card-bg)' : 'transparent', border: 'none', borderRadius: '6px' }}
                      onClick={() => { setWorkspaceMode('record'); clearWorkspaceForm(); }}
                    >
                      🎙️ Record Live
                    </button>
                  </div>

                  {workspaceMode === 'upload' ? (
                    <div>
                      <div
                        className={`upload-zone${dragActive ? ' drag' : ''}`}
                        onDragOver={e => { e.preventDefault(); setDragActive(true); }}
                        onDragLeave={() => setDragActive(false)}
                        onDrop={e => { e.preventDefault(); setDragActive(false); handleFileSelect(e.dataTransfer.files[0]); }}
                        onClick={() => !processingWorkspace && document.getElementById('personal-file-input').click()}
                        style={{
                          border: '2px dashed var(--card-border)', borderRadius: 'var(--radius)',
                          padding: '2rem', textAlign: 'center', cursor: 'pointer', transition: 'all 0.3s',
                          background: dragActive ? 'rgba(139,92,246,0.05)' : 'transparent'
                        }}
                      >
                        <input id="personal-file-input" type="file" accept=".mp3,.wav,.m4a,.ogg,.flac,.mp4,.webm" style={{ display: 'none' }}
                          onChange={e => handleFileSelect(e.target.files[0])} />
                        <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>{selectedFile ? '🎵' : '☁️'}</div>
                        {selectedFile ? (
                          <>
                            <div className="fw-600 text-sm">{selectedFile.name}</div>
                            <div className="text-xs text-muted mt-0.5">{(selectedFile.size / 1024 / 1024).toFixed(1)} MB</div>
                          </>
                        ) : (
                          <>
                            <div className="fw-600 text-sm">Drag & drop files or click to browse</div>
                            <div className="text-xs text-muted mt-0.5">Supports MP3 · WAV · M4A · MP4 · WEBM (Max 30MB)</div>
                          </>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div style={{ background: 'var(--bg3)', borderRadius: 'var(--radius)', border: '1px solid var(--card-border)' }}>
                      <VoiceRecorder 
                        label="Click microphone to record your lecture" 
                        onRecordingReady={handleRecordReady}
                      />
                    </div>
                  )}

                  {/* Form to process */}
                  {selectedFile && (
                    <div className="card mt-2" style={{ background: 'var(--bg3)', border: '1px solid var(--card-border)' }}>
                      <div className="form-group mb-2">
                        <label className="text-xs fw-700 text-muted">Lecture Title</label>
                        <input 
                          className="form-control mt-0.5" 
                          value={personalTitle} 
                          onChange={e => setPersonalTitle(e.target.value)} 
                          placeholder="e.g. Mechanics Review Lecture" 
                        />
                      </div>
                      
                      {workspaceError && <div className="alert alert-error text-xs mb-1">{workspaceError}</div>}
                      
                      {processingWorkspace ? (
                        <div className="alert alert-info flex items-center gap-1 text-xs">
                          <span className="spinner" /> {workspaceProgress}
                        </div>
                      ) : (
                        <div className="flex gap-0.5" style={{ justifyContent: 'flex-end' }}>
                          <button className="btn btn-secondary btn-sm" onClick={clearWorkspaceForm}>Clear</button>
                          <button className="btn btn-primary btn-sm" onClick={processWorkspaceLecture} disabled={!personalTitle.trim()}>
                            🚀 Process Material
                          </button>
                        </div>
                      )}
                    </div>
                  )}

                </div>
              </div>

              {/* Right Column: Library list */}
              <div className="card" style={{ display: 'flex', flexDirection: 'column' }}>
                <h3 className="fw-800 mb-1" style={{ fontSize: '1.2rem', display: 'flex', alignItems: 'center', gap: 6 }}>
                  📚 My Study Library
                </h3>
                <p className="text-xs text-muted mb-2">Previously processed personal materials stored in your local workspace.</p>

                <div style={{ flex: 1, overflowY: 'auto', maxH: '450px' }}>
                  {personalLectures.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '3rem 1rem' }}>
                      <div style={{ fontSize: '3rem', marginBottom: '0.5rem' }}>📖</div>
                      <h4 className="fw-700 text-sm">Your Library is Empty</h4>
                      <p className="text-xs text-muted">Process a lecture or meeting recording on the left to start learning with personal study sessions.</p>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-1.5">
                      {personalLectures.map((lec, idx) => (
                        <div key={idx} className="lecture-list-item" style={{ animationDelay: `${idx * 0.04}s`, padding: '0.75rem', background: 'var(--bg3)' }}>
                          <div className="lecture-list-icon" style={{ fontSize: '1.5rem' }}>🎙️</div>
                          <div className="lecture-list-info">
                            <div className="lecture-list-title text-sm fw-700" style={{ marginBottom: '0.1rem' }}>{lec.title}</div>
                            <div className="lecture-list-meta text-xs">
                              {lec.wordCount?.toLocaleString() || 0} words · personal Study
                            </div>
                          </div>
                          <div className="flex gap-0.5">
                            <button className="btn btn-secondary btn-sm" onClick={() => handleDeletePersonalLecture(lec.title)} style={{ padding: '0.25rem 0.5rem' }}>
                              🗑️
                            </button>
                            <button className="btn btn-primary btn-sm" onClick={() => loadPersonalLecture(lec.title)}>
                              Study
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

            </div>
          </>
        )}

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
                <button className="btn btn-sm btn-secondary mb-1" onClick={() => setView(activeSection ? 'section' : 'workspace')}>← Back</button>
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
                {tab === 'chat' && <ChatBox sectionId={activeSection ? activeSection.id : null} facultyName={activeSection ? activeSection.faculty : null} lectureTitle={activeLecture} userLevel={profile.levelLabel} />}
                {tab === 'quiz' && <QuizPanel sectionId={activeSection ? activeSection.id : null} lectureTitle={activeLecture} userLevel={profile.levelLabel} onScored={onQuizScored} />}
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}
