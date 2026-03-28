import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Upload, FileText, CheckCircle, AlertTriangle, ArrowRight, BrainCircuit } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function CandidateDashboard() {
  const [file, setFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [analysis, setAnalysis] = useState(null);

  const handleDragOver = (e) => e.preventDefault();
  
  const handleDrop = (e) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      setFile(e.dataTransfer.files[0]);
    }
  };

  const handleAnalyze = () => {
    if (!file) return;
    setIsUploading(true);
    // Simulate AI parsing and scoring
    setTimeout(() => {
      setIsUploading(false);
      setAnalysis({
        score: 42, // intentionally low to trigger skill-first
        missingSkills: ['Kubernetes', 'Microservices Architecture', 'System Design'],
        weakSections: ['Project descriptions lack depth', 'Experience quantified poorly'],
      });
    }, 2000);
  };

  return (
    <div className="container" style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', paddingBottom: '2rem' }}>
      <header className="app-header">
        <div className="header-inner">
          <Link to="/" className="btn-secondary" style={{ padding: '8px 16px', fontSize: '0.9rem' }}>
            &larr; Back to Roles
          </Link>
          <h2 style={{ fontSize: '1.25rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <UserIcon /> Candidate Portal
          </h2>
        </div>
      </header>

      <main className="main-content">
        <motion.div 
          initial={{ opacity: 0, y: 15 }} 
          animate={{ opacity: 1, y: 0 }}
          style={{ maxWidth: '800px', margin: '0 auto', width: '100%' }}
        >
          <h1 style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>Resume Analyzer</h1>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem' }}>
            Upload your resume. Our AI will grade it against industry standards and detect skill gaps.
          </p>

          {!analysis ? (
            <div className="glass-card" style={{ marginBottom: '2rem' }}>
              <div 
                onDragOver={handleDragOver}
                onDrop={handleDrop}
                style={{
                  border: '2px dashed var(--border-color)',
                  borderRadius: '8px',
                  padding: '4rem 2rem',
                  textAlign: 'center',
                  background: 'rgba(255, 255, 255, 0.02)',
                  transition: 'border-color 0.3s'
                }}
              >
                {!file ? (
                  <>
                    <Upload size={48} style={{ color: 'var(--accent-primary)', marginBottom: '1rem' }} />
                    <h3 style={{ marginBottom: '0.5rem' }}>Drag & drop your resume</h3>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Supports PDF, DOCX, TXT (Max 5MB)</p>
                    <input type="file" id="file-upload" style={{ display: 'none' }} onChange={(e) => setFile(e.target.files[0])} />
                    <button className="btn-secondary" style={{ marginTop: '1.5rem' }} onClick={() => document.getElementById('file-upload').click()}>
                      Browse Files
                    </button>
                  </>
                ) : (
                  <>
                    <FileText size={48} style={{ color: 'var(--success)', marginBottom: '1rem' }} />
                    <h3 style={{ marginBottom: '0.5rem' }}>{file.name}</h3>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>{(file.size / 1024).toFixed(2)} KB</p>
                    <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', marginTop: '1.5rem' }}>
                      <button className="btn-secondary" onClick={() => setFile(null)}>Remove</button>
                      <button className="btn-primary" onClick={handleAnalyze} disabled={isUploading}>
                        {isUploading ? 'Analyzing via AI...' : 'Scan with NexHire AI'}
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          ) : (
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}>
              <div className="glass-card" style={{ marginBottom: '2rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                  <h3>Analysis Complete</h3>
                  <button className="btn-secondary" onClick={() => { setAnalysis(null); setFile(null); }}>Scan New File</button>
                </div>
                
                <div style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap' }}>
                  {/* Score Circular visualization placeholder */}
                  <div style={{ flex: '1 1 200px', textAlign: 'center', padding: '1rem', background: 'rgba(255,255,255,0.03)', borderRadius: '12px' }}>
                    <h4 style={{ color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>ATS Match Score</h4>
                    <div style={{ fontSize: '4rem', fontWeight: '800', color: analysis.score < 50 ? 'var(--danger)' : 'var(--success)', lineHeight: '1' }}>
                      {analysis.score}
                    </div>
                    <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '0.5rem' }}>Out of 100</p>
                  </div>

                  <div style={{ flex: '2 1 300px' }}>
                    <h4 style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '1rem' }}>
                      <AlertTriangle size={18} color="var(--warning)" /> Keyword Gaps Detected
                    </h4>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '1.5rem' }}>
                      {analysis.missingSkills.map(skill => (
                        <span key={skill} style={{ padding: '6px 12px', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)', borderRadius: '20px', fontSize: '0.85rem', color: '#ff8a8a' }}>
                          {skill}
                        </span>
                      ))}
                    </div>

                    <h4 style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '1rem' }}>
                      <CheckCircle size={18} color="var(--success)" /> Improvement Suggestions
                    </h4>
                    <ul style={{ listStyle: 'none', padding: 0 }}>
                      {analysis.weakSections.map((sec, i) => (
                        <li key={i} style={{ marginBottom: '0.5rem', fontSize: '0.9rem', color: 'var(--text-secondary)', display: 'flex', gap: '8px' }}>
                          <span style={{ color: 'var(--accent-primary)' }}>&bull;</span> {sec}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>

              {/* The "Anti-Resume" Skill-First Trigger! */}
              {analysis.score < 50 && (
                <motion.div 
                  initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}
                  className="glass-card" 
                  style={{ background: 'linear-gradient(145deg, rgba(99, 102, 241, 0.1) 0%, rgba(20, 20, 22, 0.9) 100%)', border: '1px solid var(--accent-primary)' }}
                >
                  <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
                    <div style={{ background: 'var(--accent-primary)', padding: '12px', borderRadius: '12px', color: 'white' }}>
                      <BrainCircuit size={32} />
                    </div>
                    <div>
                      <h3 style={{ marginBottom: '0.5rem', color: '#fff' }}>Don't let a bad resume hold you back.</h3>
                      <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem', lineHeight: '1.5' }}>
                        Your resume score is low, but our system believes in <strong style={{color: 'white'}}>Skill-First Evaluation</strong>. 
                        Take a 5-minute Adaptive AI Interview to prove your skills and automatically boost your ranking.
                      </p>
                      <button className="btn-primary">
                        Start Adaptive AI Interview <ArrowRight size={18} />
                      </button>
                    </div>
                  </div>
                </motion.div>
              )}
            </motion.div>
          )}
        </motion.div>
      </main>
    </div>
  );
}

function UserIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"></path>
      <circle cx="12" cy="7" r="4"></circle>
    </svg>
  );
}
