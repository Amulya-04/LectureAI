import { useState, useEffect } from 'react';
import { examAPI, sectionAPI, userAPI } from '../api/client';

export default function Faculty({ user, onLogout, onUpdateUser }) {
  const [tab, setTab] = useState('sections');
  const [sections, setSections] = useState([]);
  const [activeSection, setActiveSection] = useState(null);
  const [sectionTab, setSectionTab] = useState('lectures'); // 'lectures' | 'students'
  const [studentsData, setStudentsData] = useState([]);
  const [msg, setMsg] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Create section form
  const [newName, setNewName] = useState('');
  const [examQuestions, setExamQuestions] = useState([{ question: '', answer: '' }]);
  const [creating, setCreating] = useState(false);

  // Upload lecture form
  const [uploadTitle, setUploadTitle] = useState('');
  const [uploadFile, setUploadFile] = useState(null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => { fetchSections(); }, []);

  const fetchSections = async () => {
    try {
      const { data } = await sectionAPI.list();
      setSections(data);
    } catch {}
  };

  const openSection = async (sec) => {
    setLoading(true); setMsg(''); setError('');
    try {
      const { data } = await sectionAPI.get(sec.id);
      setActiveSection(data);
      setTab('manage');
      const { data: sData } = await sectionAPI.getStudents(sec.id);
      setStudentsData(sData);
    } catch {} finally { setLoading(false); }
  };

  const createSection = async () => {
    if (!newName.trim()) return;
    setCreating(true); setMsg(''); setError('');
    try {
      const qs = examQuestions.filter(q => q.question.trim() && q.answer.trim());
      await sectionAPI.create(newName, qs);
      setMsg('✅ Section created successfully!');
      setNewName('');
      setExamQuestions([{ question: '', answer: '' }]);
      await fetchSections();
    } catch (e) {
      setError(e.response?.data?.error || 'Failed to create section.');
    } finally { setCreating(false); }
  };

  const uploadLecture = async () => {
    if (!uploadTitle.trim() || !uploadFile) return;
    setUploading(true); setMsg(''); setError('');
    try {
      const fd = new FormData();
      fd.append('audio', uploadFile);
      fd.append('title', uploadTitle);
      await sectionAPI.uploadLecture(activeSection.id, fd);
      setMsg(`✅ "${uploadTitle}" uploaded and students notified!`);
      setUploadTitle(''); setUploadFile(null);
      // Refresh section
      const { data } = await sectionAPI.get(activeSection.id);
      setActiveSection(data);
    } catch (e) {
      setError(e.response?.data?.error || 'Failed to upload lecture.');
    } finally { setUploading(false); }
  };

  const deleteLecture = async (title) => {
    if (!window.confirm(`Delete "${title}"?`)) return;
    try {
      await sectionAPI.deleteLecture(activeSection.id, title);
      const { data } = await sectionAPI.get(activeSection.id);
      setActiveSection(data);
    } catch (e) {
      setError(e.response?.data?.error || 'Failed to delete.');
    }
  };

  const addQ = () => setExamQuestions(q => [...q, { question: '', answer: '' }]);
  const removeQ = (i) => setExamQuestions(q => q.filter((_, idx) => idx !== i));
  const setQ = (i, k, v) => setExamQuestions(q => q.map((item, idx) => idx === i ? { ...item, [k]: v } : item));

  return (
    <div className="app-layout">
      {/* Faculty Sidebar */}
      <div className="sidebar">
        <div className="sidebar-header">
          <div className="sidebar-logo">🎓 LectureAI</div>
          <div className="text-xs text-muted mt-1">Faculty Dashboard</div>
        </div>
        <div className="sidebar-user">
          <div className="avatar">{user.username[0].toUpperCase()}</div>
          <div className="sidebar-user-info">
            <div className="sidebar-username">{user.username}</div>
            <div className="sidebar-role">👩‍🏫 Faculty</div>
          </div>
        </div>

        <div style={{ padding: '0 1rem', marginTop: '0.75rem' }}>
          <button className={`sidebar-section-btn w-full${tab === 'sections' ? ' active' : ''}`}
            onClick={() => { setTab('sections'); setActiveSection(null); setMsg(''); setError(''); }}>
            📚 My Sections
          </button>
          <button className={`sidebar-section-btn w-full${tab === 'create' ? ' active' : ''}`}
            onClick={() => { setTab('create'); setActiveSection(null); setMsg(''); setError(''); }}>
            ➕ Create Section
          </button>
          <button className={`sidebar-section-btn w-full${tab === 'info' ? ' active' : ''}`}
            onClick={() => { setTab('info'); setMsg(''); setError(''); }}>
            ℹ️ How It Works
          </button>
        </div>

        {/* Section quick links */}
        {sections.length > 0 && (
          <div className="sidebar-sections" style={{ marginTop: '0.5rem' }}>
            <div className="sidebar-section-label">SECTIONS</div>
            {sections.map(s => (
              <button key={s.id}
                className={`sidebar-lecture-btn${activeSection?.id === s.id ? ' active' : ''}`}
                onClick={() => openSection(s)}>
                📖 {s.name}
              </button>
            ))}
          </div>
        )}

        <div className="sidebar-bottom">
          <button className="btn btn-danger btn-full btn-sm" onClick={onLogout}>🚪 Logout</button>
        </div>
      </div>

      <div className="main-content">
        {msg && <div className="alert alert-success mb-2">{msg}</div>}
        {error && <div className="alert alert-error mb-2">{error}</div>}

        {/* ── MY SECTIONS ─────────────────────────────────────────── */}
        {tab === 'sections' && !activeSection && (
          <>
            <div className="page-header">
              <h2>📚 My Sections</h2>
              <p className="text-muted text-sm">Manage your subject sections and upload lecture recordings</p>
            </div>
            {sections.length === 0 ? (
              <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
                <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📭</div>
                <p className="text-muted">No sections yet. Create your first section!</p>
                <button className="btn btn-primary mt-2" onClick={() => setTab('create')}>➕ Create Section</button>
              </div>
            ) : (
              <div className="sections-grid">
                {sections.map(s => (
                  <div key={s.id} className="section-browse-card enrolled" style={{ cursor: 'pointer' }} onClick={() => openSection(s)}>
                    <div className="section-card-header">
                      <div className="section-card-icon">📖</div>
                      <span className="badge badge-success">{s.lectureCount} lectures</span>
                    </div>
                    <h3 className="section-card-title">{s.name}</h3>
                    <div className="section-card-meta">
                      <span>👥 {s.studentCount} students</span>
                      <span>📅 {new Date(s.createdAt).toLocaleDateString('en-IN')}</span>
                    </div>
                    <button className="btn btn-primary btn-full mt-2">Manage →</button>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* ── MANAGE SECTION ─────────────────────────────────────── */}
        {tab === 'manage' && activeSection && (
          <>
            <div className="page-header">
              <h2>⚙️ {activeSection.name}</h2>
              <p className="text-muted text-sm">
                👥 {activeSection.students?.length || 0} students enrolled · 📝 {activeSection.lectures?.length || 0} lectures
              </p>
            </div>

            <div className="tabs mb-2">
              <button className={`tab-btn${sectionTab === 'lectures' ? ' active' : ''}`} onClick={() => setSectionTab('lectures')}>🎙️ Lectures</button>
              <button className={`tab-btn${sectionTab === 'students' ? ' active' : ''}`} onClick={() => setSectionTab('students')}>👥 Students</button>
            </div>

            {/* Upload panel */}
            {sectionTab === 'lectures' && (
              <>
                <div className="card mb-2">
                  <h3 className="fw-600 mb-1">📤 Upload New Lecture</h3>
                  <p className="text-muted text-sm mb-2">All enrolled students will be notified when you upload</p>
                  <div className="form-group">
                    <label>Lecture Title <span className="text-muted text-xs">(students see this exact name)</span></label>
                    <input className="form-control" placeholder="e.g. Introduction to Neural Networks"
                      value={uploadTitle} onChange={e => setUploadTitle(e.target.value)} />
                  </div>
                  <div className="form-group mb-0">
                    <label>Audio / Video File</label>
                    <input type="file" className="form-control"
                      accept=".mp3,.wav,.m4a,.ogg,.flac,.mp4"
                      onChange={e => setUploadFile(e.target.files[0])} />
                  </div>
                  {uploadFile && (
                    <div className="text-xs text-muted mt-1">📎 {uploadFile.name} ({(uploadFile.size / 1024 / 1024).toFixed(1)} MB)</div>
                  )}
                  <button className="btn btn-primary mt-2"
                    disabled={uploading || !uploadTitle.trim() || !uploadFile}
                    onClick={uploadLecture}>
                    {uploading ? <><span className="spinner" /> Processing…</> : '🚀 Upload & Notify Students'}
                  </button>
                </div>

                {/* Lectures list */}
                {activeSection.lectures?.length === 0 ? (
                  <div className="card" style={{ textAlign: 'center', padding: '2rem' }}>
                    <p className="text-muted">No lectures yet. Upload your first one above!</p>
                  </div>
                ) : (
                  <div className="lectures-list">
                    {activeSection.lectures.map((lec, i) => (
                      <div key={lec.title} className="lecture-list-item">
                        <div className="lecture-list-icon">🎙️</div>
                        <div className="lecture-list-info">
                          <div className="lecture-list-title">{lec.title}</div>
                          <div className="lecture-list-meta">
                            {lec.wordCount?.toLocaleString()} words · {new Date(lec.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                          </div>
                        </div>
                        <button className="btn btn-danger btn-sm btn-icon" onClick={() => deleteLecture(lec.title)}>✕</button>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}

            {sectionTab === 'students' && (
              <div className="card">
                <h3 className="fw-600 mb-2">👥 Enrolled Students Progress</h3>
                {(!studentsData || studentsData.length === 0) ? (
                  <p className="text-muted text-sm">No students enrolled yet. Students can self-enroll from their dashboard.</p>
                ) : (
                  <div style={{ overflowX: 'auto' }}>
                    <table className="w-full text-left" style={{ borderCollapse: 'collapse', fontSize: '0.875rem' }}>
                      <thead>
                        <tr style={{ borderBottom: '1px solid var(--card-border)' }}>
                          <th style={{ padding: '0.75rem', color: 'var(--text2)' }}>Student</th>
                          <th style={{ padding: '0.75rem', color: 'var(--text2)' }}>Current Level</th>
                          <th style={{ padding: '0.75rem', color: 'var(--text2)' }}>Entry Exam Score</th>
                          <th style={{ padding: '0.75rem', color: 'var(--text2)' }}>Streak</th>
                        </tr>
                      </thead>
                      <tbody>
                        {studentsData.map((s, i) => (
                          <tr key={s.username} style={{ borderBottom: '1px solid var(--card-border)' }}>
                            <td style={{ padding: '0.75rem' }}>
                              <div className="flex items-center gap-1">
                                <div className="avatar" style={{ width: '1.8rem', height: '1.8rem', fontSize: '0.8rem' }}>
                                  {s.username[0].toUpperCase()}
                                </div>
                                <span className="fw-600">{s.username}</span>
                              </div>
                            </td>
                            <td style={{ padding: '0.75rem' }}>
                              <span className={`level-badge ${s.levelLabel.toLowerCase()}`} style={{ margin: 0 }}>
                                {s.levelLabel} ({s.levelScore})
                              </span>
                            </td>
                            <td style={{ padding: '0.75rem' }}>
                              {s.assessmentScore !== null ? `${s.assessmentScore}%` : <span className="text-muted">Not taken</span>}
                            </td>
                            <td style={{ padding: '0.75rem' }}>
                              <span style={{ color: 'var(--orange)', fontWeight: 'bold' }}>🔥 {s.streak}</span>
                              <span className="text-xs text-muted ml-1">(Best: {s.longestStreak})</span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </>
        )}

        {/* ── CREATE SECTION ─────────────────────────────────────── */}
        {tab === 'create' && (
          <>
            <div className="page-header">
              <h2>➕ Create New Section</h2>
              <p className="text-muted text-sm">Students can self-enroll. They'll take your exam before accessing lectures.</p>
            </div>

            <div className="card mb-2">
              <div className="form-group mb-0">
                <label>Section Name <span className="text-muted text-xs">(e.g. "Machine Learning – 2026")</span></label>
                <input className="form-control" placeholder="Section name"
                  value={newName} onChange={e => setNewName(e.target.value)} />
              </div>
            </div>

            <div className="page-header" style={{ paddingTop: '1rem' }}>
              <h3>📝 Entry Exam Questions <span className="text-muted text-xs">(optional – leave blank for open access)</span></h3>
            </div>

            {examQuestions.map((q, i) => (
              <div key={i} className="card mb-2" style={{ animation: 'fadeUp 0.3s ease', animationFillMode: 'both', animationDelay: `${i * 0.06}s` }}>
                <div className="flex justify-between items-center mb-1">
                  <span className="fw-600 text-sm">Question {i + 1}</span>
                  {examQuestions.length > 1 && (
                    <button className="btn btn-danger btn-sm btn-icon" onClick={() => removeQ(i)}>✕</button>
                  )}
                </div>
                <div className="form-group">
                  <label>Question</label>
                  <textarea className="form-control" rows={2}
                    placeholder="e.g. What is supervised learning?"
                    value={q.question} onChange={e => setQ(i, 'question', e.target.value)} />
                </div>
                <div className="form-group mb-0">
                  <label>Expected Answer <span className="text-muted text-xs">(students won't see this)</span></label>
                  <textarea className="form-control" rows={2}
                    placeholder="e.g. Supervised learning is..."
                    value={q.answer} onChange={e => setQ(i, 'answer', e.target.value)} />
                </div>
              </div>
            ))}

            <div className="flex gap-1 mb-3">
              <button className="btn btn-secondary" onClick={addQ}>+ Add Question</button>
              <button className="btn btn-primary" style={{ marginLeft: 'auto' }}
                disabled={creating || !newName.trim()}
                onClick={createSection}>
                {creating ? <span className="spinner" /> : '🚀 Create Section'}
              </button>
            </div>
          </>
        )}

        {/* ── HOW IT WORKS ───────────────────────────────────────── */}
        {tab === 'info' && (
          <>
            <div className="page-header"><h2>ℹ️ How It Works</h2></div>
            {[
              ['📚', 'Sections (Subjects)', 'Create a section for each subject. Students self-enroll from their dashboard and browse available sections.'],
              ['📋', 'Entry Exam', 'Optionally add exam questions. When a student joins, they answer these — the AI scores them and sets their learning level for personalised responses.'],
              ['🎙️', 'Lecture Upload', 'Upload an audio/video recording. The AI auto-transcribes and summarises it. All enrolled students get a notification badge immediately.'],
              ['🔔', 'Notifications', 'Students see a notification badge on each section with new lectures. The badge clears when they open the lecture.'],
              ['🔥', 'Streak', 'Students earn streaks for logging in on consecutive days. Visible prominently on their sidebar.'],
              ['🧠', 'Personalised AI', 'Every quiz/exam updates the student\'s level. The AI tutor adapts its language — simple for Beginners, technical for Advanced.'],
            ].map(([icon, title, desc]) => (
              <div key={title} className="card mb-2">
                <div className="flex gap-2 items-center mb-1">
                  <span style={{ fontSize: '1.5rem' }}>{icon}</span>
                  <span className="fw-600">{title}</span>
                </div>
                <p className="text-sm text-muted">{desc}</p>
              </div>
            ))}
          </>
        )}
      </div>
    </div>
  );
}
