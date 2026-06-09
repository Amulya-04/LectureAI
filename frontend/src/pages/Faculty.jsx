import { useState, useEffect } from 'react';
import { examAPI, sectionAPI, userAPI } from '../api/client';
import VoiceRecorder from '../components/VoiceRecorder';

export default function Faculty({ user, onLogout, onUpdateUser }) {
  const [tab, setTab] = useState('sections');
  const [sections, setSections] = useState([]);
  const [activeSection, setActiveSection] = useState(null);
  const [sectionTab, setSectionTab] = useState('lectures'); // 'lectures' | 'students' | 'doubts'
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
  const [uploadMode, setUploadMode] = useState('file'); // 'file' | 'record'

  // Doubt responses state
  const [answers, setAnswers] = useState({}); // { [doubtId]: answerText }
  const [submittingAnswer, setSubmittingAnswer] = useState({});

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
      setSectionTab('lectures');
      const { data: sData } = await sectionAPI.getStudents(sec.id);
      setStudentsData(sData);
    } catch {} finally { setLoading(false); }
  };

  const refreshSectionData = async () => {
    if (!activeSection) return;
    try {
      const { data } = await sectionAPI.get(activeSection.id);
      setActiveSection(data);
    } catch {}
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

  const handleRecordReady = (file, blobUrl) => {
    setUploadFile(file);
    if (!uploadTitle) {
      const timestamp = new Date().toLocaleString();
      setUploadTitle(`Lecture Recording - ${timestamp}`);
    }
  };

  const handleSendAnswer = async (doubtId) => {
    const answerText = answers[doubtId]?.trim();
    if (!answerText) return;
    setSubmittingAnswer(prev => ({ ...prev, [doubtId]: true }));
    try {
      await sectionAPI.answerDoubt(activeSection.id, doubtId, answerText);
      setMsg('✅ Response submitted successfully!');
      setAnswers(prev => ({ ...prev, [doubtId]: '' }));
      await refreshSectionData();
    } catch (e) {
      setError('Failed to submit response.');
    } finally {
      setSubmittingAnswer(prev => ({ ...prev, [doubtId]: false }));
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

        <div style={{ padding: '0 1rem', marginTop: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
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
                👥 {activeSection.students?.length || 0} students enrolled · 📝 {activeSection.lectures?.length || 0} lectures · ❓ {activeSection.doubts?.filter(d => !d.answer).length || 0} pending doubts
              </p>
            </div>

            <div className="tabs mb-2">
              <button className={`tab-btn${sectionTab === 'lectures' ? ' active' : ''}`} onClick={() => setSectionTab('lectures')}>🎙️ Lectures</button>
              <button className={`tab-btn${sectionTab === 'students' ? ' active' : ''}`} onClick={() => setSectionTab('students')}>👥 Students</button>
              <button className={`tab-btn${sectionTab === 'doubts' ? ' active' : ''}`} onClick={() => setSectionTab('doubts')}>
                ❓ Student Doubts {(activeSection.doubts?.filter(d => !d.answer).length > 0) && (
                  <span className="badge badge-warning text-xs" style={{ background: '#f59e0b', color: '#fff', padding: '1px 6px', borderRadius: '4px', marginLeft: '4px' }}>
                    {activeSection.doubts.filter(d => !d.answer).length}
                  </span>
                )}
              </button>
            </div>

            {/* Upload panel */}
            {sectionTab === 'lectures' && (
              <>
                <div className="card mb-2">
                  <h3 className="fw-600 mb-1">📤 Upload New Lecture</h3>
                  <p className="text-muted text-sm mb-2">All enrolled students will be notified when you upload</p>
                  
                  {/* Mode Selector */}
                  <div className="tabs mb-2" style={{ display: 'flex', gap: '0.25rem', padding: '0.2rem', background: 'var(--bg3)', borderRadius: '8px', maxWidth: '300px' }}>
                    <button 
                      className={`tab-btn`} 
                      style={{ flex: 1, padding: '0.4rem', fontSize: '0.8rem', background: uploadMode === 'file' ? 'var(--card-bg)' : 'transparent', border: 'none', borderRadius: '6px' }}
                      onClick={() => { setUploadMode('file'); setUploadFile(null); setUploadTitle(''); }}
                    >
                      📁 Upload File
                    </button>
                    <button 
                      className={`tab-btn`} 
                      style={{ flex: 1, padding: '0.4rem', fontSize: '0.8rem', background: uploadMode === 'record' ? 'var(--card-bg)' : 'transparent', border: 'none', borderRadius: '6px' }}
                      onClick={() => { setUploadMode('record'); setUploadFile(null); setUploadTitle(''); }}
                    >
                      🎙️ Record Lecture
                    </button>
                  </div>

                  <div className="form-group">
                    <label>Lecture Title <span className="text-muted text-xs">(students see this exact name)</span></label>
                    <input className="form-control" placeholder="e.g. Introduction to Neural Networks"
                      value={uploadTitle} onChange={e => setUploadTitle(e.target.value)} />
                  </div>

                  {uploadMode === 'file' ? (
                    <div className="form-group mb-0">
                      <label>Audio / Video File</label>
                      <input type="file" className="form-control"
                        accept=".mp3,.wav,.m4a,.ogg,.flac,.mp4"
                        onChange={e => setUploadFile(e.target.files[0])} />
                    </div>
                  ) : (
                    <div className="card mb-0" style={{ background: 'var(--bg3)', border: '1px solid var(--card-border)' }}>
                      <VoiceRecorder label="Record your lecture directly from microphone" onRecordingReady={handleRecordReady} />
                    </div>
                  )}

                  {uploadFile && (
                    <div className="text-xs text-muted mt-1">📎 Ready: {uploadFile.name} ({(uploadFile.size / 1024 / 1024).toFixed(1)} MB)</div>
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

            {/* Enrolled Students */}
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

            {/* Student doubts tab */}
            {sectionTab === 'doubts' && (
              <div className="card">
                <h3 className="fw-800 text-base mb-1">📬 Student doubts Inbox</h3>
                <p className="text-xs text-muted mb-2">Answer questions posted by students about your lectures in this section.</p>

                {(!activeSection.doubts || activeSection.doubts.length === 0) ? (
                  <div style={{ textAlign: 'center', padding: '3rem 1rem' }}>
                    <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🎉</div>
                    <p className="text-muted text-sm">All clear! No doubts submitted by students yet.</p>
                  </div>
                ) : (
                  <div className="flex flex-col gap-2">
                    {[...activeSection.doubts].reverse().map((d) => {
                      const isPending = !d.answer;
                      return (
                        <div key={d._id} className="card" style={{
                          padding: '1.25rem',
                          background: 'var(--bg3)',
                          border: isPending ? '1px solid #f59e0b40' : '1px solid var(--card-border)',
                          borderLeft: isPending ? '4px solid #f59e0b' : '4px solid #10b981'
                        }}>
                          <div className="flex justify-between items-start mb-1">
                            <div>
                              <span className="text-xs text-muted">Student: <strong>{d.student}</strong></span>
                              <span style={{ margin: '0 0.5rem', color: 'var(--card-border)' }}>|</span>
                              <span className="text-xs text-muted">Lecture: <strong>{d.lectureTitle}</strong></span>
                            </div>
                            <span className={`badge ${d.answer ? 'badge-success' : 'badge-warning'} text-xs`} style={{
                              background: d.answer ? 'rgba(16,185,129,0.1)' : 'rgba(245,158,11,0.1)',
                              color: d.answer ? '#10b981' : '#f59e0b',
                              padding: '3px 8px', borderRadius: '4px'
                            }}>
                              {d.answer ? 'Answered' : 'Pending Response'}
                            </span>
                          </div>

                          <div className="text-sm fw-600 mb-1" style={{ color: 'var(--text-main)' }}>Q: {d.question}</div>
                          <div className="text-xxs text-muted mb-1.5">Submitted on {new Date(d.createdAt).toLocaleString()}</div>

                          {d.answer ? (
                            <div style={{ background: 'var(--card-bg)', padding: '0.75rem', borderRadius: '6px', border: '1px solid var(--card-border)', marginTop: '0.75rem' }}>
                              <span className="text-xs text-muted fw-700" style={{ textTransform: 'uppercase', letterSpacing: '0.04em' }}>Your Response:</span>
                              <p className="text-xs" style={{ margin: '0.25rem 0 0 0', lineHeight: 1.5 }}>{d.answer}</p>
                              
                              {/* Edit option */}
                              <details style={{ marginTop: '0.5rem' }}>
                                <summary className="text-xxs text-muted fw-600" style={{ cursor: 'pointer' }}>Edit Response</summary>
                                <div className="mt-0.5">
                                  <textarea
                                    className="form-control"
                                    rows={2}
                                    style={{ fontSize: '0.8rem', background: 'var(--bg2)', color: 'var(--text-main)', width: '100%', padding: '0.4rem', borderRadius: '4px', border: '1px solid var(--card-border)' }}
                                    placeholder="Update your response..."
                                    value={answers[d._id] !== undefined ? answers[d._id] : d.answer}
                                    onChange={(e) => setAnswers(prev => ({ ...prev, [d._id]: e.target.value }))}
                                  />
                                  <button
                                    className="btn btn-primary btn-sm mt-0.5"
                                    style={{ padding: '0.25rem 0.6rem', fontSize: '0.75rem' }}
                                    disabled={submittingAnswer[d._id] || !answers[d._id]?.trim()}
                                    onClick={() => handleSendAnswer(d._id)}
                                  >
                                    Update Answer
                                  </button>
                                </div>
                              </details>
                            </div>
                          ) : (
                            <div className="mt-1" style={{ borderTop: '1px dashed var(--card-border)', paddingTop: '0.75rem' }}>
                              <label className="text-xs fw-700 text-muted">Type Your Response</label>
                              <textarea
                                className="form-control mt-0.5"
                                rows={2}
                                placeholder="Answer the student's question clearly..."
                                value={answers[d._id] || ''}
                                onChange={(e) => setAnswers(prev => ({ ...prev, [d._id]: e.target.value }))}
                                style={{
                                  width: '100%', padding: '0.5rem', borderRadius: '4px',
                                  background: 'var(--card-bg)', color: 'var(--text-main)',
                                  border: '1px solid var(--card-border)', fontSize: '0.8rem',
                                  resize: 'vertical', marginBottom: '0.5rem'
                                }}
                              />
                              <div className="flex" style={{ justifyContent: 'flex-end' }}>
                                <button
                                  className="btn btn-primary btn-sm"
                                  disabled={submittingAnswer[d._id] || !answers[d._id]?.trim()}
                                  onClick={() => handleSendAnswer(d._id)}
                                >
                                  {submittingAnswer[d._id] ? 'Sending...' : 'Send Response'}
                                </button>
                              </div>
                            </div>
                          )}

                        </div>
                      );
                    })}
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
              ['🎙️', 'Lecture Upload', 'Upload an audio/video recording or record directly. The AI auto-transcribes and summarises it. All enrolled students get a notification badge immediately.'],
              ['❓', 'Student Doubts', 'Students can submit lecture doubts. Faculty can reply directly to doubts from the doubts inbox tab.'],
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
