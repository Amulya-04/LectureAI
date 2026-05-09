import { useState, useRef, useEffect } from 'react';
import { lectureAPI, sectionAPI } from '../api/client';

export default function ChatBox({ lectureTitle, userLevel, sectionId }) {
  const [messages, setMessages] = useState([
    { role: 'ai', content: `👋 Hi! I'm your AI tutor, personalised for **${userLevel}** level. Ask me anything about this lecture!` }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef(null);

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

  const suggestions = [
    'What are the main topics covered?',
    'Explain the key concepts simply',
    'What are the most important takeaways?',
    'Give me a quick summary',
  ];

  const formatMsg = (text) => text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>').replace(/\n/g, '<br/>');

  return (
    <div className="chat-wrap" style={{ height: 'calc(100vh - 200px)', background: 'var(--bg2)', borderRadius: 'var(--radius)', border: '1px solid var(--card-border)', overflow: 'hidden' }}>
      <div className="chat-messages">
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
        <div style={{ padding: '0 1rem', display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
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
    </div>
  );
}
