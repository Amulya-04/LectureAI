export default function SummaryView({ lecture, userLevel, activeLecture }) {
  const { summary, fileUrl, transcript } = lecture;
  
  // Determine if video or audio based on extension
  const isVideo = fileUrl && fileUrl.match(/\.(mp4|webm)$/i);

  return (
    <div className="lecture-content-grid">
      <div className="lecture-main-col">
        {fileUrl && (
          <div className="card mb-2 media-player-container">
            {isVideo ? (
              <video controls src={fileUrl} className="w-full rounded" style={{ maxHeight: '400px', background: '#000' }}>
                Your browser does not support the video tag.
              </video>
            ) : (
              <audio controls src={fileUrl} className="w-full">
                Your browser does not support the audio element.
              </audio>
            )}
          </div>
        )}

        {summary && summary.overview && (
          <div className="card mb-2" style={{ borderLeft: '3px solid var(--purple)', background: 'rgba(124,110,237,0.06)' }}>
            <div className="text-xs text-muted fw-600 mb-1" style={{ textTransform: 'uppercase', letterSpacing: '0.06em' }}>📋 Overview</div>
            <p className="text-sm" style={{ lineHeight: 1.7 }}>{summary.overview}</p>
          </div>
        )}

        <div className="card mb-2 transcript-card">
          <div className="text-xs text-muted fw-600 mb-1" style={{ textTransform: 'uppercase', letterSpacing: '0.06em' }}>📝 Full Transcript</div>
          <div className="transcript-box">
            {transcript || 'No transcript available.'}
          </div>
        </div>
      </div>

      <div className="lecture-side-col">
        {summary && (
          <>
            {summary.key_topics?.length > 0 && (
              <div className="card mb-2">
                <div className="text-xs text-muted fw-600 mb-1" style={{ textTransform: 'uppercase', letterSpacing: '0.06em' }}>🎯 Key Topics</div>
                <div style={{ display: 'flex', flexWrap: 'wrap' }}>
                  {summary.key_topics.map(t => <span key={t} className="topic-chip">{t}</span>)}
                </div>
              </div>
            )}

            <div className="summary-grid">
              {[
                { key: 'main_points', title: '📌 Main Points' },
                { key: 'key_concepts', title: '💡 Key Concepts' },
                { key: 'action_items', title: '✅ Action Items' },
              ].filter(s => summary[s.key]?.length > 0).map(({ key, title }) => (
                <div key={key} className="summary-section">
                  <h4>{title}</h4>
                  <ul>
                    {summary[key].map((item, i) => <li key={i}>{item}</li>)}
                  </ul>
                </div>
              ))}
            </div>
          </>
        )}

        <div className="card mt-2" style={{ background: 'rgba(34,211,238,0.04)', borderColor: 'rgba(34,211,238,0.15)' }}>
          <p className="text-xs text-muted">
            🎯 Explanations are tailored to your <strong style={{ color: 'var(--cyan)' }}>{userLevel}</strong> level. Take a quiz or ask questions to level up!
          </p>
        </div>
      </div>
    </div>
  );
}
