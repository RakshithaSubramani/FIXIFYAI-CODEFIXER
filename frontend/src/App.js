import React, { useState } from 'react';
import axios from 'axios';
import DiffViewer from 'react-diff-viewer-continued';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import './App.css';

function App() {
  const [code, setCode] = useState('');
  const [language, setLanguage] = useState('javascript');
  const [autoDetect, setAutoDetect] = useState(false);
  const [fixedCode, setFixedCode] = useState('');
  const [explanation, setExplanation] = useState('');
  const [report, setReport] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);

  const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

  const detectLanguage = (text) => {
    const lines = String(text || '').split(/\r?\n/).slice(0, 50).join('\n');
    if (/#include\s+[<"].+[>"]/.test(lines) || /\bstd::\b/.test(lines)) return 'cpp';
    if (/^\s*package\s+\w+/m.test(lines) || /\bpublic\s+class\b/.test(lines)) return 'java';
    if (/^\s*def\s+\w+\(.*\)\s*:/m.test(lines) || /^\s*import\s+\w+/m.test(lines)) return 'python';
    if (/\binterface\s+\w+/.test(lines) || /:\s*(string|number|boolean|any|unknown|never)\b/.test(lines)) return 'typescript';
    if (/^\s*func\s+\w+\(.*\)\s*\{/m.test(lines) || /\bfmt\.(Print|Println|Printf)\b/.test(lines)) return 'go';
    return 'javascript';
  };

  const handleFix = async () => {
    if (!code.trim()) return alert('Paste some code!');
    try {
      setLoading(true);
      const langToSend = autoDetect ? detectLanguage(code) : language;
      if (autoDetect) setLanguage(langToSend);
      const { data } = await axios.post(`${API_URL}/api/fix`, { code, language: langToSend });
      const nextReport = data.report || null;
      setReport(nextReport);
      setFixedCode(nextReport?.correctedCode || data.fixedCode || '');
      setExplanation(data.explanation || '');
    } catch (err) {
      alert('Error: ' + (err.response?.data?.error || err.message));
    } finally {
      setLoading(false);
    }
  };

  const loadHistory = async () => {
    try {
      const { data } = await axios.get(`${API_URL}/api/history`);
      setHistory(data);
    } catch (err) {
      console.error(err);
    }
  };

  const getSeverityClass = (severity) => {
    const s = (severity || 'medium').toLowerCase();
    if (s === 'high' || s === 'critical') return 'severity-high';
    if (s === 'low') return 'severity-low';
    return 'severity-medium';
  };

  return (
    <div className="app-container">
      <header className="header">
        <h1>FIXIFYAI</h1>
        <p className="tagline">AI-Powered Code Debugger & Optimizer</p>
      </header>

      <div className="input-section">
        <label className="input-label">
          <span className="label-icon">📝</span>
          Select Language
        </label>
        <select value={language} onChange={e => setLanguage(e.target.value)}>
          <option value="javascript">JavaScript</option>
          <option value="python">Python</option>
          <option value="java">Java</option>
          <option value="cpp">C++</option>
          <option value="go">Go</option>
          <option value="typescript">TypeScript</option>
        </select>
        <label className="checkbox-row">
          <input
            type="checkbox"
            checked={autoDetect}
            onChange={(e) => setAutoDetect(e.target.checked)}
          />
          Auto-detect language from code
        </label>

        <label className="input-label">
          <span className="label-icon">💻</span>
          Your Code
        </label>
        <textarea
          placeholder="// Paste your buggy code here...&#10;// FIXIFYAI will analyze, debug, and optimize it for you."
          value={code}
          onChange={e => setCode(e.target.value)}
        />

        <div className="button-group">
          <button className="btn-primary" onClick={handleFix} disabled={loading}>
            {loading ? (
              <>
                <span className="spinner"></span>
                Analyzing...
              </>
            ) : (
              <>
                <span>🔧</span>
                Fix & Explain
              </>
            )}
          </button>
          <button className="btn-secondary" onClick={loadHistory}>
            <span>📜</span>
            Load History
          </button>
        </div>
      </div>

      {(report || fixedCode) && (
        <div className="results-section">
          {report?.analysis && (
            <div className="result-card">
              <h2>
                <span className="section-icon">🔍</span>
                Analysis
              </h2>
              <div className="card-content">
                <p style={{ whiteSpace: 'pre-wrap', background: 'transparent', padding: '0', borderRadius: '0' }}>
                  {report.analysis}
                </p>
              </div>
            </div>
          )}

          {Array.isArray(report?.detectedProblems) && report.detectedProblems.length > 0 && (
            <div className="result-card">
              <h2>
                <span className="section-icon">🐞</span>
                Detected Problems
                <span className="badge">{report.detectedProblems.length}</span>
              </h2>
              <ul className="problems-list">
                {report.detectedProblems.map((p, idx) => (
                  <li key={idx} className={`problem-item ${getSeverityClass(p.severity)}`}>
                    <div className="problem-header">
                      <span className={`severity-badge ${getSeverityClass(p.severity)}`}>
                        {(p.severity || 'medium').toUpperCase()}
                      </span>
                      <span className="problem-type">{(p.type || 'other').toString()}</span>
                    </div>
                    <div className="problem-message">{p.message}</div>
                    {(p.approxLine || p.snippet) && (
                      <div className="problem-meta">
                        {p.approxLine && <span className="line-number">Line ~{p.approxLine}</span>}
                        {p.snippet && <code className="snippet">{p.snippet}</code>}
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {Array.isArray(report?.fixes) && report.fixes.length > 0 && (
            <div className="result-card">
              <h2>
                <span className="section-icon">🛠️</span>
                Fixes & Explanations
              </h2>
              <ul className="fixes-list">
                {report.fixes.map((f, idx) => (
                  <li key={idx} className="fix-item">
                    <div className="fix-number">{idx + 1}</div>
                    <div className="fix-content">
                      <div className="fix-message">{f.message}</div>
                      <div className="fix-reason">{f.reason}</div>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {fixedCode && (
            <>
              <div className="result-card">
                <h2>
                  <span className="section-icon">✨</span>
                  Corrected Code
                </h2>
                <div className="code-block">
                  <SyntaxHighlighter 
                    language={language} 
                    style={oneDark}
                    customStyle={{
                      margin: 0,
                      borderRadius: '8px',
                      fontSize: '0.875rem',
                    }}
                  >
                    {fixedCode}
                  </SyntaxHighlighter>
                </div>
              </div>

              <div className="result-card">
                <h2>
                  <span className="section-icon">📊</span>
                  Code Comparison
                </h2>
                <div className="diff-container">
                  <DiffViewer 
                    oldValue={code} 
                    newValue={fixedCode} 
                    splitView={true}
                    useDarkTheme={true}
                    leftTitle="Original Code"
                    rightTitle="Fixed Code"
                    styles={{
                      variables: {
                        dark: {
                          diffViewerBackground: '#161b22',
                          addedBackground: '#1c4428',
                          addedColor: '#3fb950',
                          removedBackground: '#4d1f23',
                          removedColor: '#f85149',
                          wordAddedBackground: '#26522e',
                          wordRemovedBackground: '#6e2b2d',
                          addedGutterBackground: '#1c4428',
                          removedGutterBackground: '#4d1f23',
                          gutterBackground: '#161b22',
                          gutterBackgroundDark: '#0d1117',
                          highlightBackground: '#21262d',
                          highlightGutterBackground: '#21262d',
                        }
                      }
                    }}
                  />
                </div>
              </div>
            </>
          )}

          {!report && explanation && (
            <div className="result-card">
              <h2>
                <span className="section-icon">💡</span>
                Explanation
              </h2>
              <div className="card-content">
                <p style={{ whiteSpace: 'pre-wrap', background: 'transparent', padding: '0' }}>
                  {explanation}
                </p>
              </div>
            </div>
          )}

          {report?.optimizedCode && (
            <div className="result-card optimized">
              <h2>
                <span className="section-icon">⚡</span>
                Optimized Code
              </h2>
              <div className="code-block">
                <SyntaxHighlighter 
                  language={language} 
                  style={oneDark}
                  customStyle={{
                    margin: 0,
                    borderRadius: '8px',
                    fontSize: '0.875rem',
                  }}
                >
                  {report.optimizedCode}
                </SyntaxHighlighter>
              </div>
            </div>
          )}
        </div>
      )}

      <div className="history-section">
        <h2>
          <span className="section-icon">📜</span>
          Recent Fixes
        </h2>
        {history.length === 0 ? (
          <div className="empty-state">
            <span className="empty-icon">📭</span>
            <p>No fixes yet. Click "Load History" to fetch previous fixes.</p>
          </div>
        ) : (
          <ul className="history-list">
            {history.map((h, i) => (
              <li key={i} className="history-item">
                <div className="history-header">
                  <span className="language-badge">{h.language.toUpperCase()}</span>
                  <span className="history-date">{new Date(h.createdAt).toLocaleString()}</span>
                </div>
                <code className="history-preview">
                  {h.originalCode.substring(0, 100)}...
                </code>
              </li>
            ))}
          </ul>
        )}
      </div>

      <footer className="footer">
        <p>Built with ❤️ using React & AI</p>
      </footer>
    </div>
  );
}

export default App;
