import { useState, useRef, useEffect } from 'react';

export default function VoiceRecorder({ onRecordingReady, label = 'Click to start recording' }) {
  const [state, setState] = useState('idle'); // idle | recording | reviewing
  const [timer, setTimer] = useState(0);
  const [blobUrl, setBlobUrl] = useState(null);
  const [permError, setPermError] = useState('');
  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);
  const timerRef = useRef(null);
  const streamRef = useRef(null);

  useEffect(() => () => {
    clearInterval(timerRef.current);
    if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop());
    if (blobUrl) URL.revokeObjectURL(blobUrl);
  }, []);

  const fmt = (s) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

  const startRecording = async () => {
    setPermError('');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      chunksRef.current = [];
      const mr = new MediaRecorder(stream);
      mediaRecorderRef.current = mr;
      mr.ondataavailable = e => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      mr.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        const url = URL.createObjectURL(blob);
        setBlobUrl(url);
        setState('reviewing');
        stream.getTracks().forEach(t => t.stop());
      };
      mr.start(100);
      setState('recording');
      setTimer(0);
      timerRef.current = setInterval(() => {
        setTimer(t => {
          if (t >= 1799) { stopRecording(); return t; }
          return t + 1;
        });
      }, 1000);
    } catch (e) {
      setPermError('Microphone access denied. Please allow microphone access in your browser settings and try again.');
    }
  };

  const stopRecording = () => {
    clearInterval(timerRef.current);
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
  };

  const confirm = () => {
    if (!blobUrl) return;
    fetch(blobUrl).then(r => r.blob()).then(blob => {
      const file = new File([blob], 'recording.webm', { type: 'audio/webm' });
      onRecordingReady(file, blobUrl);
    });
  };

  const reset = () => {
    if (blobUrl) URL.revokeObjectURL(blobUrl);
    setBlobUrl(null);
    setTimer(0);
    setState('idle');
  };

  const barDelays = ['0s', '0.15s', '0.3s', '0.45s', '0.6s'];

  return (
    <div style={{ textAlign: 'center', padding: '1.5rem' }}>
      {permError && <div className="alert alert-error mb-2">{permError}</div>}

      {state === 'idle' && (
        <>
          <button
            onClick={startRecording}
            style={{
              width: 88, height: 88, borderRadius: '50%', border: 'none', cursor: 'pointer',
              background: 'linear-gradient(135deg, #8b5cf6, #06b6d4)',
              boxShadow: '0 8px 30px rgba(139,92,246,0.4)', color: 'white',
              fontSize: '2rem', display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 1rem', transition: 'all 0.3s',
            }}
            onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.08)'}
            onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
          >🎙️</button>
          <div className="text-sm text-muted">{label}</div>
          <div className="text-xs text-muted" style={{ marginTop: '0.3rem' }}>Max 30 minutes · MP3/WAV/WebM</div>
        </>
      )}

      {state === 'recording' && (
        <>
          {/* Pulsing ring */}
          <div style={{ position: 'relative', width: 88, height: 88, margin: '0 auto 1rem' }}>
            <div style={{
              position: 'absolute', inset: -8, borderRadius: '50%',
              border: '3px solid rgba(239,68,68,0.3)',
              animation: 'pulse 1.2s ease-in-out infinite',
            }} />
            <button
              onClick={stopRecording}
              style={{
                width: 88, height: 88, borderRadius: '50%', border: 'none', cursor: 'pointer',
                background: 'linear-gradient(135deg, #ef4444, #dc2626)',
                boxShadow: '0 8px 30px rgba(239,68,68,0.4)', color: 'white',
                fontSize: '1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
            >⏹</button>
          </div>
          <div style={{ fontSize: '1.5rem', fontWeight: 800, fontFamily: 'Outfit, sans-serif', color: '#ef4444', marginBottom: '0.75rem' }}>
            {fmt(timer)}
          </div>
          {/* Animated sound bars */}
          <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'center', gap: 5, height: 32, marginBottom: '1rem' }}>
            {barDelays.map((delay, i) => (
              <div key={i} style={{
                width: 5, borderRadius: 3, background: 'linear-gradient(to top, #8b5cf6, #06b6d4)',
                animation: `soundBar 0.8s ease-in-out infinite alternate`,
                animationDelay: delay,
                height: '60%',
              }} />
            ))}
          </div>
          <div className="text-xs text-muted">🔴 Recording — click ⏹ to stop</div>
        </>
      )}

      {state === 'reviewing' && blobUrl && (
        <>
          <div className="text-sm fw-600 mb-2">🎧 Review your recording</div>
          <audio controls src={blobUrl} style={{ width: '100%', marginBottom: '1rem' }} />
          <div className="flex gap-1" style={{ justifyContent: 'center' }}>
            <button className="btn btn-secondary" onClick={reset}>🔄 Record Again</button>
            <button className="btn btn-primary" onClick={confirm}>✅ Use This Recording</button>
          </div>
        </>
      )}

      <style>{`
        @keyframes soundBar {
          from { transform: scaleY(0.3); }
          to { transform: scaleY(1); }
        }
      `}</style>
    </div>
  );
}
