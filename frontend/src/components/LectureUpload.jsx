import { useState } from 'react';
import { lectureAPI } from '../api/client';

export default function LectureUpload({ onUploadDone }) {
  const [file, setFile] = useState(null);
  const [title, setTitle] = useState('');
  const [drag, setDrag] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState('');
  const [error, setError] = useState('');

  const handleFile = (f) => {
    if (!f) return;
    setFile(f);
    if (!title) setTitle(f.name.replace(/\.[^.]+$/, '').replace(/[-_]/g, ' '));
  };

  const upload = async () => {
    if (!file || !title.trim()) return;
    setError(''); setUploading(true);
    const steps = ['🎵 Saving audio...', '📝 Transcribing with Groq Whisper...', '🧠 Generating summary...', '✅ Done!'];
    let s = 0;
    setProgress(steps[s]);
    const interval = setInterval(() => { s = Math.min(s + 1, steps.length - 1); setProgress(steps[s]); }, 5000);
    try {
      const fd = new FormData();
      fd.append('audio', file);
      fd.append('title', title.trim());
      const { data } = await lectureAPI.upload(fd);
      clearInterval(interval); setProgress('✅ Done!');
      setTimeout(() => { onUploadDone(data); setFile(null); setTitle(''); setProgress(''); setUploading(false); }, 800);
    } catch (e) {
      clearInterval(interval); setError(e.response?.data?.error || 'Upload failed.'); setUploading(false); setProgress('');
    }
  };

  return (
    <div>
      <div
        className={`upload-zone${drag ? ' drag' : ''}`}
        onDragOver={e => { e.preventDefault(); setDrag(true); }}
        onDragLeave={() => setDrag(false)}
        onDrop={e => { e.preventDefault(); setDrag(false); handleFile(e.dataTransfer.files[0]); }}
        onClick={() => !uploading && document.getElementById('file-input').click()}
      >
        <input id="file-input" type="file" accept=".mp3,.wav,.m4a,.ogg,.flac" style={{ display: 'none' }}
          onChange={e => handleFile(e.target.files[0])} />
        <div className="upload-icon">{file ? '🎵' : '☁️'}</div>
        {file ? (
          <>
            <div className="fw-600">{file.name}</div>
            <div className="text-sm text-muted mt-1">{(file.size / 1024 / 1024).toFixed(1)} MB</div>
          </>
        ) : (
          <>
            <div className="fw-600">Drag & drop audio here</div>
            <div className="text-sm text-muted mt-1">MP3 · WAV · M4A · OGG · FLAC · max 30MB</div>
          </>
        )}
      </div>

      {file && (
        <div className="card mt-2">
          <div className="form-group mb-2">
            <label>Lecture Title</label>
            <input className="form-control" value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Introduction to Neural Networks" />
          </div>
          {error && <div className="alert alert-error mb-1">{error}</div>}
          {uploading ? (
            <div className="alert alert-info flex items-center gap-1">
              <span className="spinner" /> {progress}
            </div>
          ) : (
            <div className="flex gap-1">
              <button className="btn btn-secondary" onClick={() => { setFile(null); setTitle(''); }}>Clear</button>
              <button className="btn btn-primary" style={{ marginLeft: 'auto' }} onClick={upload} disabled={!title.trim()}>
                🚀 Process Lecture
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
