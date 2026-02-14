import React, { useState, useEffect } from 'react';
import axios from 'axios';
import DiffViewer from 'react-diff-viewer-continued';
import Editor from '@monaco-editor/react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import LandingPage from './LandingPage';
import './App.css';

function App() {
  const [showLanding, setShowLanding] = useState(true);
  const [code, setCode] = useState('');
  const [language, setLanguage] = useState('javascript');
  const [autoDetect, setAutoDetect] = useState(false);
  const [modelPreference, setModelPreference] = useState('balanced');
  const [fixedCode, setFixedCode] = useState('');
  const [explanation, setExplanation] = useState('');
  const [report, setReport] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [theme, setTheme] = useState('dark');

  const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

  useEffect(() => {
    document.body.className = theme === 'light' ? 'light-theme' : '';
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'dark' ? 'light' : 'dark');
  };

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
      
      const { data } = await axios.post(`${API_URL}/api/fix`, { 
        code, 
        language: langToSend,
        modelPreference
      });
      
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

  const getConfidenceScore = (index) => {
    if (!report?.confidence_scores) return 0;
    const item = report.confidence_scores.find(c => c.problem_index === index);
    return item ? item.score : 0;
  };

  if (showLanding) {
    return <LandingPage onStart={() => setShowLanding(false)} />;
  }

  return (
    <div className="app-container">
      <button className="theme-toggle" onClick={toggleTheme} title="Toggle Theme">
        {theme === 'dark' ? '☀️' : '🌙'}
      </button>

      <header className="header">
        <h1>FIXIFYAI</h1>
        <p className="tagline">Enterprise AI Code Debugger</p>
      </header>

      <div className="input-section">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          <div>
            <label className="input-label">
              <span className="label-icon">📝</span>
              Language
            </label>
            <select value={language} onChange={e => setLanguage(e.target.value)}>
              <option value="javascript">JavaScript</option>
              <option value="typescript">TypeScript</option>
              <option value="python">Python</option>
              <option value="java">Java</option>
              <option value="cpp">C++</option>
              <option value="go">Go</option>
            </select>
            <label className="checkbox-row">
              <input
                type="checkbox"
                checked={autoDetect}
                onChange={(e) => setAutoDetect(e.target.checked)}
              />
              Auto-detect
            </label>
          </div>
          <div>
            <label className="input-label">
              <span className="label-icon">⚙️</span>
              Model Mode
            </label>
            <select value={modelPreference} onChange={e => setModelPreference(e.target.value)}>
              <option value="fast">Fast (Flash)</option>
              <option value="balanced">Balanced</option>
              <option value="accurate">Accurate (Pro)</option>
            </select>
          </div>
        </div>

        <label className="input-label">
          <span className="label-icon">💻</span>
          Your Code
        </label>
        <div className="monaco-wrapper">
          <Editor
            height="300px"
            language={language}
            theme={theme === 'dark' ? 'vs-dark' : 'light'}
            value={code}
            onChange={(value) => setCode(value || '')}
            options={{
              minimap: { enabled: false },
              fontSize: 14,
              scrollBeyondLastLine: false,
              automaticLayout: true
            }}
          />
        </div>

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
          {report?.quality_score && (
            <div className="result-card" style={{ position: 'relative' }}>
               <div className="quality-score-container">
                 <div className="quality-grade">{report.quality_score}</div>
                 <div className="quality-label">Quality Score</div>
               </div>
               <h2>
                <span className="section-icon">🔍</span>
                Analysis
              </h2>
              <div className="card-content" style={{ paddingRight: '100px' }}>
                <p style={{ whiteSpace: 'pre-wrap' }}>{report.analysis}</p>
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
                    <div className="confidence-section">
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        <span>AI Confidence</span>
                        <span>{getConfidenceScore(idx) || 90}%</span>
                      </div>
                      <div className="confidence-bar-container">
                        <div 
                          className="confidence-bar" 
                          style={{ width: `${getConfidenceScore(idx) || 90}%` }}
                        />
                      </div>
                    </div>
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
                <div className="monaco-wrapper">
                  <Editor
                    height="400px"
                    language={language}
                    theme={theme === 'dark' ? 'vs-dark' : 'light'}
                    value={fixedCode}
                    options={{
                      readOnly: true,
                      minimap: { enabled: false },
                      fontSize: 14,
                      scrollBeyondLastLine: false
                    }}
                  />
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
                    useDarkTheme={theme === 'dark'}
                    leftTitle="Original Code"
                    rightTitle="Fixed Code"
                    styles={{
                      variables: {
                        dark: {
                          diffViewerBackground: '#1e1e1e',
                          addedBackground: '#044B53',
                          addedColor: 'white',
                          removedBackground: '#632F34',
                          removedColor: 'white',
                        }
                      }
                    }}
                  />
                </div>
              </div>
            </>
          )}

          {report?.optimizedCode && (
            <div className="result-card optimized">
              <h2>
                <span className="section-icon">⚡</span>
                Optimized Code
              </h2>
              <div className="monaco-wrapper">
                <Editor
                  height="400px"
                  language={language}
                  theme={theme === 'dark' ? 'vs-dark' : 'light'}
                  value={report.optimizedCode}
                  options={{
                    readOnly: true,
                    minimap: { enabled: false },
                    fontSize: 14,
                    scrollBeyondLastLine: false
                  }}
                />
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
        <p>Built with ❤️ using React & Gemini AI</p>
      </footer>
    </div>
  );
}

export default App;
