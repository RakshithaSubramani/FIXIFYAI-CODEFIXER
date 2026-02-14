import React from 'react';
import './App.css';

function LandingPage({ onStart }) {
  return (
    <div className="landing-container">
      <header className="landing-header">
        <div className="logo">Fixify AI</div>
        <nav>
          <a href="#features">Features</a>
          <a href="#architecture">Architecture</a>
          <a href="https://github.com/RakshithaSubramani/FIXIFYAI-CODEFIXER" target="_blank" rel="noopener noreferrer">GitHub</a>
        </nav>
      </header>

      <main>
        <section className="hero">
          <h1>Enterprise-Grade AI Code Debugging</h1>
          <p>Analyze, Fix, and Optimize code in 5+ languages with advanced static analysis and LLM reasoning.</p>
          <button className="btn-primary hero-btn" onClick={onStart}>Start Debugging Now</button>
        </section>

        <section id="features" className="features-grid">
          <div className="feature-card">
            <h3>🚀 Multi-Language Support</h3>
            <p>Python, JavaScript, Java, C++, Go. Auto-detection included.</p>
          </div>
          <div className="feature-card">
            <h3>🛡️ Enterprise Security</h3>
            <p>Static analysis first, AI second. Secure execution environment.</p>
          </div>
          <div className="feature-card">
            <h3>⚡ Real-time Diff</h3>
            <p>Side-by-side comparison with Monaco Editor integration.</p>
          </div>
          <div className="feature-card">
            <h3>📊 Quality Scoring</h3>
            <p>Get A-F grades and confidence metrics for every fix.</p>
          </div>
        </section>

        <section id="architecture" className="architecture-section">
          <h2>System Architecture</h2>
          <div className="arch-diagram">
            <div className="arch-box">Frontend (React + Monaco)</div>
            <div className="arrow">⬇️ API (Express + Zod)</div>
            <div className="arch-box">Backend Orchestrator</div>
            <div className="split-arrow">
              <span>↙️</span> <span>↘️</span>
            </div>
            <div className="arch-row">
              <div className="arch-box">Static Analysis (ESLint/etc)</div>
              <div className="arch-box">LLM Engine (Gemini Pro/Flash)</div>
            </div>
          </div>
        </section>
      </main>

      <footer className="landing-footer">
        <p>&copy; 2026 Fixify AI. All rights reserved.</p>
      </footer>
    </div>
  );
}

export default LandingPage;
