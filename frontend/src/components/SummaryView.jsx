export default function SummaryView({ lecture, userLevel, activeLecture }) {
  const { summary, fileUrl, transcript } = lecture;
  
  // Determine if video or audio based on extension
  const isVideo = fileUrl && fileUrl.match(/\.(mp4|webm)$/i);

  const handleExportPDF = () => {
    const printWindow = window.open('', '_blank', 'width=800,height=1000');
    if (!printWindow) {
      alert('Please allow popups to export the PDF');
      return;
    }

    const topicsHTML = summary?.key_topics?.map(t => `<span class="pill">${t}</span>`).join('') || '';
    const pointsHTML = summary?.main_points?.map(p => `<li>${p}</li>`).join('') || '';
    const conceptsHTML = summary?.key_concepts?.map(c => `<li>${c}</li>`).join('') || '';
    const actionsHTML = summary?.action_items?.map(a => `<li>${a}</li>`).join('') || '';

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>LectureAI - ${activeLecture || 'Lecture Study Material'}</title>
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">
        <style>
          body {
            font-family: 'Inter', sans-serif;
            color: #1f2937;
            line-height: 1.6;
            margin: 0;
            padding: 40px;
            background: #fff;
          }
          .header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            border-bottom: 2px solid #e5e7eb;
            padding-bottom: 20px;
            margin-bottom: 30px;
          }
          .logo {
            font-size: 24px;
            font-weight: 800;
            color: #8b5cf6;
          }
          .badge {
            background: rgba(139, 92, 246, 0.1);
            color: #8b5cf6;
            padding: 6px 12px;
            border-radius: 9999px;
            font-size: 12px;
            font-weight: 600;
          }
          h1 {
            font-size: 28px;
            font-weight: 800;
            margin: 0 0 10px 0;
            color: #111827;
          }
          .meta {
            font-size: 14px;
            color: #6b7280;
            margin-bottom: 30px;
          }
          .section {
            margin-bottom: 30px;
          }
          .section-title {
            font-size: 16px;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 0.05em;
            color: #4b5563;
            margin-bottom: 12px;
            border-bottom: 1px solid #f3f4f6;
            padding-bottom: 6px;
          }
          .overview-box {
            background: rgba(139, 92, 246, 0.03);
            border-left: 4px solid #8b5cf6;
            padding: 16px;
            border-radius: 0 8px 8px 0;
            font-size: 15px;
            margin-bottom: 30px;
          }
          .pill-container {
            display: flex;
            flex-wrap: wrap;
            gap: 8px;
            margin-bottom: 20px;
          }
          .pill {
            background: #f3f4f6;
            color: #374151;
            padding: 4px 10px;
            border-radius: 6px;
            font-size: 13px;
            font-weight: 500;
          }
          ul {
            padding-left: 20px;
            margin: 0;
          }
          li {
            margin-bottom: 8px;
            font-size: 14.5px;
          }
          .footer {
            margin-top: 50px;
            border-top: 1px solid #e5e7eb;
            padding-top: 20px;
            text-align: center;
            font-size: 12px;
            color: #9ca3af;
          }
          @media print {
            body { padding: 20px; }
            .no-print { display: none; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="logo">🎓 LectureAI</div>
          <div class="badge">${userLevel} Level</div>
        </div>

        <h1>${activeLecture || 'Lecture Study Material'}</h1>
        <div class="meta">Exported on ${new Date().toLocaleDateString()}</div>

        ${summary?.overview ? `
          <div class="section">
            <div class="section-title">📋 Overview</div>
            <div class="overview-box">${summary.overview}</div>
          </div>
        ` : ''}

        ${topicsHTML ? `
          <div class="section">
            <div class="section-title">🎯 Key Topics</div>
            <div class="pill-container">${topicsHTML}</div>
          </div>
        ` : ''}

        ${pointsHTML ? `
          <div class="section">
            <div class="section-title">📌 Main Points</div>
            <ul>${pointsHTML}</ul>
          </div>
        ` : ''}

        ${conceptsHTML ? `
          <div class="section">
            <div class="section-title">💡 Key Concepts</div>
            <ul>${conceptsHTML}</ul>
          </div>
        ` : ''}

        ${actionsHTML ? `
          <div class="section">
            <div class="section-title">✅ Action Items</div>
            <ul>${actionsHTML}</ul>
          </div>
        ` : ''}

        <div class="footer">
          Generated automatically by LectureAI personalized learning platform.
        </div>

        <script>
          window.onload = function() {
            setTimeout(function() {
              window.print();
            }, 500);
          }
        </script>
      </body>
      </html>
    `;

    printWindow.document.write(htmlContent);
    printWindow.document.close();
  };

  return (
    <div className="lecture-content-grid">
      <div className="lecture-main-col">


        {summary && summary.overview && (
          <div className="card mb-2" style={{ borderLeft: '3px solid var(--purple)', background: 'rgba(124,110,237,0.06)' }}>
            <div className="flex items-center justify-between mb-1">
              <div className="text-xs text-muted fw-600" style={{ textTransform: 'uppercase', letterSpacing: '0.06em' }}>📋 Overview</div>
              <button className="btn btn-secondary btn-sm" onClick={handleExportPDF}>📄 Export PDF</button>
            </div>
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
