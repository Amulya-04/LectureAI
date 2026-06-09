import { useState, useRef, useEffect } from 'react';
import { lectureAPI, sectionAPI } from '../api/client';

export default function ChatBox({ lectureTitle, userLevel, sectionId, facultyName }) {
  const [messages, setMessages] = useState([
    { role: 'ai', content: `👋 Hi! I'm your AI tutor, personalised for **${userLevel}** level. Ask me anything about this lecture!` }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef(null);

  // Doubt states
  const [showDoubtPanel, setShowDoubtPanel] = useState(false);
  const [doubtQuestion, setDoubtQuestion] = useState('');
  const [doubts, setDoubts] = useState([]);
  const [submittingDoubt, setSubmittingDoubt] = useState(false);
  const [doubtMsg, setDoubtMsg] = useState({ text: '', type: '' });

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const send = async (q) => {
    const question = (q || input).trim();
    if (!question || loading) return;
    setInput('');
    setMessages(m => [...m, { role: 'user', content: question }]);
    setLoading(true);
    try {
      const history = messages.slice(-6).map(m => ({ role: m.role === 'ai' ? 'assistant' : 'user', content: m.content }));
      const { data } = sectionId
        ? await sectionAPI.ask(sectionId, lectureTitle, question, history)
        : await lectureAPI.ask(lectureTitle, question, history);
      setMessages(m => [...m, { role: 'ai', content: data.answer }]);
    } catch (e) {
      setMessages(m => [...m, { role: 'ai', content: '⚠️ Something went wrong. Please try again.' }]);
    } finally { setLoading(false); }
  };

  const loadDoubts = async () => {
    if (!sectionId) return;
    try {
      const { data } = await sectionAPI.getDoubts(sectionId);
      // Filter for current lecture
      const filtered = data.filter(d => d.lectureTitle === lectureTitle);
      setDoubts(filtered);
    } catch (e) {
      console.error('Failed to load doubts', e);
    }
  };

  const handleOpenDoubtPanel = () => {
    setDoubtQuestion('');
    setDoubtMsg({ text: '', type: '' });
    setShowDoubtPanel(true);
    loadDoubts();
  };

  const handleSubmitDoubt = async (e) => {
    e.preventDefault();
    if (!doubtQuestion.trim()) return;
    setSubmittingDoubt(true);
    setDoubtMsg({ text: '', type: '' });
    try {
      await sectionAPI.submitDoubt(sectionId, lectureTitle, doubtQuestion.trim());
      setDoubtMsg({ text: '🚀 Doubt submitted to faculty successfully!', type: 'success' });
      setDoubtQuestion('');
      loadDoubts();
    } catch (err) {
      setDoubtMsg({ text: err.response?.data?.error || 'Failed to submit doubt.', type: 'error' });
    } finally {
      setSubmittingDoubt(false);
    }
  };

  const suggestions = [
    'What are the main topics covered?',
    'Explain the key concepts simply',
    'What are the most important takeaways?',
    'Give me a quick summary',
  ];

  const formatMsg = (text) => text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>').replace(/\n/g, '<br/>');

  return (
    <div className="chat-wrap" style={{ height: 'calc(100vh - 200px)', background: 'var(--bg2)', borderRadius: 'var(--radius)', border: '1px solid var(--card-border)', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
      
      {/* Chat Header */}
      <div className="flex items-center justify-between" style={{ padding: '0.75rem 1rem', background: 'var(--bg3)', borderBottom: '1px solid var(--card-border)' }}>
        <div className="flex items-center gap-1">
          <span style={{ fontSize: '1.2rem' }}>🤖</span>
          <span className="fw-700 text-sm">Personalised AI Tutor</span>
          <span className="badge badge-success text-xs" style={{ background: 'rgba(34,211,238,0.1)', color: 'var(--cyan)' }}>{userLevel}</span>
        </div>
        {sectionId && (
          <button className="btn btn-secondary btn-sm" onClick={handleOpenDoubtPanel}>
            ❓ Ask Faculty
          </button>
        )}
      </div>

      <div className="chat-messages" style={{ flex: 1, overflowY: 'auto' }}>
        {messages.map((m, i) => (
          <div key={i} className={`chat-bubble ${m.role === 'user' ? 'user' : 'ai'}`}
            dangerouslySetInnerHTML={{ __html: formatMsg(m.content) }} />
        ))}
        {loading && (
          <div className="chat-bubble ai">
            <span className="spinner" />
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Suggestions */}
      {messages.length <= 1 && (
        <div style={{ padding: '0 1rem', display: 'flex', flexWrap: 'wrap', gap: '0.4rem', marginBottom: '0.5rem' }}>
          {suggestions.map(s => (
            <button key={s} className="btn btn-secondary btn-sm" onClick={() => send(s)}>{s}</button>
          ))}
        </div>
      )}

      <div className="chat-input-row">
        <input
          className="chat-input"
          placeholder={`Ask anything about this lecture (${userLevel} level)...`}
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && send()}
          disabled={loading}
        />
        <button className="btn btn-primary" onClick={() => send()} disabled={loading || !input.trim()}>
          {loading ? <span className="spinner" /> : '➤'}
        </button>
      </div>

      {/* Ask Faculty Modal/Overlay */}
      {showDoubtPanel && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(8,4,28,0.68)',
          backdropFilter: 'blur(10px)', zIndex: 1000,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: '1rem',
          animation: 'fadeUp 0.3s ease'
        }}>
          <div className="card" style={{
            maxWidth: 580, width: '100%', padding: '2rem',
            background: 'var(--bg2)', border: '1px solid rgba(139,92,246,0.18)',
            boxShadow: '0 25px 50px -12px rgba(139,92,246,0.25)', position: 'relative',
            maxHeight: '90vh', display: 'flex', flexDirection: 'column',
            borderRadius: '24px'
          }}>
            {/* Close button */}
            <button 
              onClick={() => setShowDoubtPanel(false)}
              style={{
                position: 'absolute', top: '1.25rem', right: '1.25rem',
                border: 'none', background: 'rgba(0,0,0,0.04)', color: 'var(--text2)',
                fontSize: '1rem', cursor: 'pointer', width: '32px', height: '32px',
                borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                transition: 'all 0.2s'
              }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(239,68,68,0.1)'}
              onMouseLeave={e => e.currentTarget.style.background = 'rgba(0,0,0,0.04)'}
            >✕</button>

            {/* Header Block */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', marginBottom: '1.25rem' }}>
              <div style={{
                width: '46px', height: '46px', borderRadius: '14px',
                background: 'linear-gradient(135deg, #8b5cf6, #06b6d4)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '1.4rem', color: '#fff', boxShadow: '0 4px 12px rgba(139,92,246,0.3)'
              }}>❓</div>
              <div>
                <h3 className="fw-800" style={{ margin: 0, fontSize: '1.35rem', color: 'var(--text)' }}>
                  Ask Your Faculty
                </h3>
                <p className="text-xs text-muted" style={{ margin: 0 }}>
                  Subject Mentor: <strong style={{ color: 'var(--primary)' }}>{facultyName || 'Course Instructor'}</strong>
                </p>
              </div>
            </div>

            <form onSubmit={handleSubmitDoubt} className="mb-2">
              {doubtMsg.text && (
                <div className={`alert ${doubtMsg.type === 'success' ? 'alert-success' : 'alert-error'} text-xs`} style={{ padding: '0.75rem 1rem', marginBottom: '0.75rem' }}>
                  {doubtMsg.text}
                </div>
              )}
              <textarea
                className="form-control"
                placeholder="Write your specific question or topic confusion here..."
                rows={3}
                required
                value={doubtQuestion}
                onChange={e => setDoubtQuestion(e.target.value)}
                style={{
                  width: '100%', padding: '0.85rem', borderRadius: '12px',
                  border: '1px solid rgba(139,92,246,0.2)', background: 'var(--bg3)',
                  color: 'var(--text-main)', fontSize: '0.875rem', resize: 'vertical',
                  marginBottom: '0.75rem', outline: 'none', transition: 'all 0.3s'
                }}
                onFocus={e => e.currentTarget.style.borderColor = 'var(--primary)'}
              />
              <div className="flex gap-1" style={{ justifyContent: 'flex-end' }}>
                <button type="button" className="btn btn-secondary btn-sm" style={{ borderRadius: '8px' }} onClick={() => setShowDoubtPanel(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary btn-sm" style={{ borderRadius: '8px', padding: '0.5rem 1.25rem' }} disabled={submittingDoubt || !doubtQuestion.trim()}>
                  {submittingDoubt ? 'Sending...' : '🚀 Submit Doubt'}
                </button>
              </div>
            </form>

            <hr style={{ border: 'none', borderTop: '1px solid var(--card-border)', margin: '1rem 0' }} />

            {/* Previous doubts section */}
            <h4 className="fw-800 text-sm mb-1.5" style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--text2)' }}>
              📬 Active doubts & Responses
            </h4>
            
            <div style={{ flex: 1, overflowY: 'auto', maxHeight: '250px', paddingRight: '4px' }}>
              {doubts.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '2rem 1rem', background: 'var(--bg3)', borderRadius: '12px', border: '1px dashed var(--card-border)' }}>
                  <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>💬</div>
                  <p className="text-xs text-muted" style={{ margin: 0 }}>
                    No questions logged for this lecture yet.
                  </p>
                </div>
              ) : (
                <div className="flex flex-col gap-2">
                  {doubts.map((d) => (
                    <div key={d._id} className="card" style={{
                      padding: '1rem', background: 'var(--bg3)',
                      border: '1px solid var(--card-border)', borderRadius: '14px',
                      boxShadow: 'none'
                    }}>
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-xxs text-muted fw-600">SUBMITTED ON {new Date(d.createdAt).toLocaleDateString()}</span>
                        <span className={`badge ${d.answer ? 'badge-success' : 'badge-warning'} text-xxs`} style={{
                          background: d.answer ? 'rgba(16,185,129,0.1)' : 'rgba(245,158,11,0.1)',
                          color: d.answer ? '#10b981' : '#f59e0b',
                          padding: '3px 8px', borderRadius: '6px'
                        }}>
                          {d.answer ? '✅ Resolved' : '⏳ Pending'}
                        </span>
                      </div>
                      
                      <div style={{ display: 'flex', gap: 6, alignItems: 'flex-start' }}>
                        <span style={{ fontSize: '1rem' }}>🙋</span>
                        <p className="text-xs fw-700" style={{ margin: 0, color: 'var(--text)' }}>{d.question}</p>
                      </div>

                      {d.answer && (
                        <div style={{
                          marginTop: '0.75rem',
                          background: 'linear-gradient(135deg, rgba(139,92,246,0.06) 0%, rgba(6,182,212,0.03) 100%)',
                          borderLeft: '3px solid #8b5cf6', padding: '0.75rem 1rem',
                          borderRadius: '8px'
                        }}>
                          <div className="flex items-center gap-0.5 mb-0.5">
                            <span style={{ fontSize: '0.9rem' }}>👩‍🏫</span>
                            <span className="text-xxs text-muted fw-800" style={{ textTransform: 'uppercase', letterSpacing: '0.04em' }}>Faculty Response:</span>
                          </div>
                          <p className="text-xs" style={{ margin: 0, color: 'var(--text2)', lineHeight: 1.5 }}>{d.answer}</p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
