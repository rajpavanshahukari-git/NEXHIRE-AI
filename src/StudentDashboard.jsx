import React, { useState, useEffect } from 'react';
import {
  getRecommendedJobs, parseResumeText, applyToJob, getApplicationsByStudent,
  getNotifications, markNotificationRead, getUnreadCount,
  getSkillRecommendations, saveCodingProfile, getCodingProfile,
  getInterviewsByStudent, getJobs
} from './store';

export default function StudentDashboard({ user, onLogout }) {
  const [tab, setTab] = useState('dashboard');
  const [resumeText, setResumeText] = useState('');
  const [parsedResume, setParsedResume] = useState(null);
  
  // Scanner states
  const [isScanning, setIsScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState('');
  const [scannedLines, setScannedLines] = useState([]);

  const [recommendedJobs, setRecommendedJobs] = useState([]);
  const [myApplications, setMyApplications] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [applyMsg, setApplyMsg] = useState('');
  const [courseRecs, setCourseRecs] = useState([]);
  const [interviews, setInterviews] = useState([]);
  const [codingProfiles, setCodingProfiles] = useState({
    leetcode: '', codechef: '', smartinterviews: '', github: '', linkedin: ''
  });
  const [profileReminders, setProfileReminders] = useState([]);
  
  const [targetDomain, setTargetDomain] = useState('Tech');
  const [newProfileKey, setNewProfileKey] = useState('');
  const [newProfileUrl, setNewProfileUrl] = useState('');

  useEffect(() => {
    refreshData();
    const interval = setInterval(refreshData, 5000); // poll for new notifications
    return () => clearInterval(interval);
  }, [user.id]);

  const refreshData = () => {
    setMyApplications(getApplicationsByStudent(user.id));
    setNotifications(getNotifications(user.id));
    setUnreadCount(getUnreadCount(user.id));
    setInterviews(getInterviewsByStudent(user.id));
    const saved = getCodingProfile(user.id);
    if (saved && Object.keys(saved).length) setCodingProfiles(prev => ({ ...prev, ...saved }));
  };

  const handleParseResumeData = (textToParse) => {
    if (!textToParse.trim()) return;
    const parsed = parseResumeText(textToParse, targetDomain);
    setParsedResume(parsed);
    const jobs = getRecommendedJobs(parsed.skills);
    setRecommendedJobs(jobs);

    // Auto-detect coding profiles from resume (Tech only)
    let reminders = [];
    if (targetDomain !== 'Finance / Non-Tech') {
      const detectedProfiles = parsed.codingProfiles || {};
      const profileFields = [
        { key: 'leetcode', label: 'LeetCode' },
        { key: 'codechef', label: 'CodeChef' },
        { key: 'github', label: 'GitHub' },
        { key: 'linkedin', label: 'LinkedIn' },
      ];
      profileFields.forEach(({ key, label }) => {
        if (detectedProfiles[key]) {
          setCodingProfiles(prev => ({ ...prev, [key]: detectedProfiles[key] }));
        } else {
          reminders.push(`⚠️ No ${label} profile found. Add it dynamically to improve your candidacy!`);
        }
      });
    }
    setProfileReminders(reminders);

    // Generate course recommendations for ALL job skill gaps
    const allMissing = new Set();
    jobs.forEach(j => {
      j.skills.forEach(s => {
        if (!parsed.skills.map(ps => ps.toLowerCase()).includes(s.toLowerCase())) {
          allMissing.add(s);
        }
      });
    });
    setCourseRecs(getSkillRecommendations([...allMissing]));
  };

  const handleParseResume = () => handleParseResumeData(resumeText);

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setIsScanning(true);
    setScanProgress('Initializing AI Engine...');
    setScannedLines(['Establishing secure connection...', 'Loading document structure...']);
    setParsedResume(null);
    setResumeText('');

    try {
      let extractedText = '';
      await new Promise(r => setTimeout(r, 800)); // UI delay

      setScanProgress('Extracting Document Text...');
      if (file.name.endsWith('.pdf')) {
        setScannedLines(prev => [...prev.slice(-3), 'Identified PDF format. Engaging PDF.js engine...']);
        const arrayBuffer = await file.arrayBuffer();
        const pdf = await window.pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        for (let i = 1; i <= pdf.numPages; i++) {
          const page = await pdf.getPage(i);
          const content = await page.getTextContent();
          const strings = content.items.map(item => item.str);
          extractedText += strings.join(' ') + '\n';
          setScannedLines(prev => [...prev.slice(-3), `Parsing page ${i} of ${pdf.numPages}...`]);
          await new Promise(r => setTimeout(r, 250));
        }
      } else if (file.name.endsWith('.docx')) {
        setScannedLines(prev => [...prev.slice(-3), 'Identified DOCX format. Engaging Mammoth engine...']);
        const arrayBuffer = await file.arrayBuffer();
        const result = await window.mammoth.extractRawText({ arrayBuffer });
        extractedText = result.value;
        setScannedLines(prev => [...prev.slice(-3), 'Extracting raw strings from Word document...']);
        await new Promise(r => setTimeout(r, 600));
      } else {
        setScannedLines(prev => [...prev.slice(-3), 'Identified standard TXT format. Reading direct...']);
        extractedText = await new Promise((resolve) => {
          const reader = new FileReader();
          reader.onload = (ev) => resolve(ev.target.result);
          reader.readAsText(file);
        });
        await new Promise(r => setTimeout(r, 600));
      }

      setScanProgress('Analyzing Skills & Context...');
      const lines = extractedText.split('\n').filter(l => l.trim().length > 0);
      for(let i=0; i < Math.min(lines.length, 6); i++) {
        setScannedLines(prev => [...prev.slice(-3), `> ${lines[i].substring(0, 40)}...`]);
        await new Promise(r => setTimeout(r, 300));
      }

      setResumeText(extractedText);
      setScanProgress('Finalizing Intelligence Report...');
      await new Promise(r => setTimeout(r, 600));
      
      // Execute the actual sync logic
      handleParseResumeData(extractedText);
      setIsScanning(false);
      
    } catch (err) {
      console.error(err);
      setScanProgress('Error parsing document.');
      setScannedLines(prev => [...prev.slice(-3), `ERROR: Could not parse file.`]);
      setTimeout(() => setIsScanning(false), 2000);
    }
  };

  const handleApply = (job) => {
    if (!parsedResume) return;
    const res = applyToJob(job.id, user.id, { skills: parsedResume.skills, name: user.name });
    if (res.success) {
      setApplyMsg(`Applied to "${job.title}" — Score: ${res.application.score}% — ${res.application.status}`);
      refreshData();
    } else {
      setApplyMsg(res.message);
    }
    setTimeout(() => setApplyMsg(''), 4000);
  };

  const handleSaveProfiles = () => {
    saveCodingProfile(user.id, codingProfiles);
    setApplyMsg('Coding profiles saved successfully!');
    setTimeout(() => setApplyMsg(''), 3000);
  };

  const handleAddCustomProfile = () => {
    if (newProfileKey.trim() && newProfileUrl.trim()) {
      setCodingProfiles(prev => ({ ...prev, [newProfileKey.toLowerCase().trim()]: newProfileUrl.trim() }));
      setNewProfileKey('');
      setNewProfileUrl('');
    }
  };

  const handleMarkRead = (id) => {
    markNotificationRead(id);
    refreshData();
  };

  const initials = user.name ? user.name.split(' ').map(w => w[0]).join('').toUpperCase() : '?';

  return (
    <div className="dashboard">
      {/* Sidebar */}
      <aside className="sidebar">
        <div className="sidebar-logo">
          <img src="/logo.jpg" alt="NexHire AI" style={{ height: '40px', objectFit: 'contain' }} />
        </div>
        <nav className="sidebar-nav">
          <button className={tab === 'dashboard' ? 'active' : ''} onClick={() => setTab('dashboard')}>
            <span>📊</span> <span>Dashboard</span>
          </button>
          <button className={tab === 'resume' ? 'active' : ''} onClick={() => setTab('resume')}>
            <span>📄</span> <span>Resume Scan</span>
          </button>
          <button className={tab === 'jobs' ? 'active' : ''} onClick={() => setTab('jobs')}>
            <span>💼</span> <span>Job Board</span>
          </button>
          <button className={tab === 'improve' ? 'active' : ''} onClick={() => setTab('improve')}>
            <span>🚀</span> <span>Skill Boost</span>
          </button>
          
          {targetDomain !== 'Finance / Non-Tech' && (
            <button className={tab === 'profiles' ? 'active' : ''} onClick={() => setTab('profiles')}>
              <span>🔗</span> <span>Dynamic Profiles</span>
            </button>
          )}

          <button className={tab === 'applications' ? 'active' : ''} onClick={() => setTab('applications')}>
            <span>📋</span> <span>My Applications</span>
          </button>
          <button className={tab === 'interviews' ? 'active' : ''} onClick={() => setTab('interviews')}>
            <span>🎤</span> <span>Interviews</span>
          </button>
          <button className={tab === 'notifications' ? 'active' : ''} onClick={() => setTab('notifications')} style={{ position: 'relative' }}>
            <span>🔔</span> <span>Notifications</span>
            {unreadCount > 0 && (
              <span style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'var(--danger)', color: 'white', borderRadius: '10px', padding: '2px 7px', fontSize: '0.7rem', fontWeight: 700 }}>
                {unreadCount}
              </span>
            )}
          </button>
          <button onClick={onLogout}>
            <span>🚪</span> <span>Logout</span>
          </button>
        </nav>
        <div className="sidebar-user">
          <div className="user-name">{user.name}</div>
          <div className="user-role">{user.role}</div>
        </div>
      </aside>

      {/* Main */}
      <div className="dash-main">
        <div className="credentials-panel">
          <h4>🔐 Your Session Credentials</h4>
          <div className="cred-row"><span className="cred-label">Name</span><span className="cred-value">{user.name}</span></div>
          <div className="cred-row"><span className="cred-label">Email</span><span className="cred-value">{user.email}</span></div>
          <div className="cred-row"><span className="cred-label">Role</span><span className="cred-value">{user.role}</span></div>
          <div className="cred-row"><span className="cred-label">User ID</span><span className="cred-value">{user.id}</span></div>
        </div>

        {applyMsg && (
          <div style={{ background: 'var(--success-bg)', color: 'var(--success)', padding: '12px 16px', borderRadius: '8px', marginBottom: '1rem', fontWeight: 600, fontSize: '0.9rem' }}>
            ✅ {applyMsg}
          </div>
        )}

        {/* ===== DASHBOARD ===== */}
        {tab === 'dashboard' && (
          <div>
            <div className="dash-header">
              <div>
                <h1>Welcome, {user.name}! 👋</h1>
                <p style={{ color: 'var(--text-light)', marginTop: '4px' }}>Your smart career dashboard</p>
              </div>
              <div className="profile-avatar">{initials}</div>
            </div>

            <div className="stat-row">
              <div className="stat-card">
                <div className="stat-icon" style={{ background: 'var(--primary-bg)', color: 'var(--primary)' }}>📄</div>
                <div className="stat-value">{parsedResume ? parsedResume.skills.length : 0}</div>
                <div className="stat-label">Skills Detected</div>
              </div>
              <div className="stat-card">
                <div className="stat-icon" style={{ background: 'var(--success-bg)', color: 'var(--success)' }}>💼</div>
                <div className="stat-value">{recommendedJobs.filter(j => j.meetsRequirement).length}</div>
                <div className="stat-label">Jobs You Qualify</div>
              </div>
              <div className="stat-card">
                <div className="stat-icon" style={{ background: 'var(--accent-orange-bg)', color: 'var(--accent-orange)' }}>📋</div>
                <div className="stat-value">{myApplications.length}</div>
                <div className="stat-label">Applications Sent</div>
              </div>
              <div className="stat-card">
                <div className="stat-icon" style={{ background: 'var(--accent-pink-bg)', color: 'var(--accent-pink)' }}>🔔</div>
                <div className="stat-value">{unreadCount}</div>
                <div className="stat-label">New Notifications</div>
              </div>
            </div>

            {/* Profile Reminders */}
            {profileReminders.length > 0 && (
              <div className="card" style={{ marginBottom: '1.5rem', borderLeft: '4px solid var(--warning)' }}>
                <h3 style={{ marginBottom: '0.75rem', color: 'var(--warning)' }}>⚠️ Profile Reminders</h3>
                {profileReminders.slice(0, 3).map((r, i) => (
                  <p key={i} style={{ color: 'var(--text-mid)', fontSize: '0.9rem', marginBottom: '6px' }}>{r}</p>
                ))}
                <button className="btn btn-secondary btn-sm" style={{ marginTop: '0.5rem' }} onClick={() => setTab('profiles')}>
                  Add Your Profiles →
                </button>
              </div>
            )}

            {/* Upcoming Interview */}
            {interviews.filter(i => i.status === 'Scheduled').length > 0 && (
              <div className="card" style={{ marginBottom: '1.5rem', borderLeft: '4px solid var(--primary)' }}>
                <h3 style={{ marginBottom: '0.75rem' }}>🎤 Upcoming Interviews</h3>
                {interviews.filter(i => i.status === 'Scheduled').map(i => (
                  <div key={i.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
                    <div>
                      <strong>{i.type}</strong>
                      <p style={{ color: 'var(--text-light)', fontSize: '0.85rem' }}>{i.date} at {i.time}</p>
                    </div>
                    <a href={i.meetLink} target="_blank" rel="noopener noreferrer" className="btn btn-primary btn-sm">
                      Join Google Meet 🔗
                    </a>
                  </div>
                ))}
              </div>
            )}

            <div className="card" style={{ marginBottom: '1.5rem' }}>
              <h3 style={{ marginBottom: '0.75rem' }}>🚀 Quick Start</h3>
              <p style={{ color: 'var(--text-mid)', lineHeight: '1.6', marginBottom: '1rem' }}>
                Upload your resume to unlock AI-powered job recommendations, skill gap analysis, and course suggestions.
              </p>
              <button className="btn btn-primary" onClick={() => setTab('resume')}>Upload Resume →</button>
            </div>
          </div>
        )}

        {/* ===== RESUME SCAN ===== */}
        {tab === 'resume' && (
          <div>
            <div className="dash-header"><h1>📄 Resume Scanner</h1></div>
            
            {isScanning ? (
              <div className="scanner-overlay" style={{ marginBottom: '1.5rem' }}>
                <div className="scanner-laser"></div>
                <div className="scanner-icon">🤖</div>
                <div className="scanner-status">{scanProgress}</div>
                <div className="scanner-terminal">
                  {scannedLines.map((line, idx) => (
                    <div key={idx} className="terminal-line">{line}</div>
                  ))}
                  <div className="terminal-cursor"></div>
                </div>
              </div>
            ) : (
              <div className="card" style={{ marginBottom: '1.5rem' }}>
                <h3 style={{ marginBottom: '1rem' }}>Upload or Paste Your Resume</h3>

                <div className="form-group" style={{ marginBottom: '1.5rem', background: 'var(--primary-bg)', padding: '1rem', borderRadius: '8px' }}>
                  <label style={{ color: 'var(--primary)', fontWeight: '600' }}>🎯 Select Target Domain</label>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-mid)', marginBottom: '8px' }}>
                    Select "Finance / Non-Tech" (e.g., Chartered Accountant) to bypass strictly programming-focused tech evaluations and hide coding profile requests.
                  </p>
                  <select value={targetDomain} onChange={e => setTargetDomain(e.target.value)} style={{ background: 'white', width: '250px' }}>
                    <option value="Tech">Tech / Engineering (Default)</option>
                    <option value="Finance / Non-Tech">Finance / Admin / Non-Tech</option>
                  </select>
                </div>

                <div style={{ marginBottom: '1rem' }}>
                  <input type="file" accept=".txt,.pdf,.docx" onChange={handleFileUpload} />
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-light)', marginTop: '6px' }}>
                    Supports PDF, DOCX, and TXT files. Include your LeetCode, CodeChef, GitHub links for bonus analysis!
                  </p>
                </div>
                <div className="form-group">
                  <label>Resume Content</label>
                  <textarea
                    rows={12}
                    placeholder={"Paste your resume here...\n\nExample:\nJohn Doe\nSoftware Engineer\n\nSkills: React, JavaScript, Python, Node.js, SQL, Git, Docker\n\nCoding Profiles:\nhttps://leetcode.com/johndoe\nhttps://github.com/johndoe\nhttps://www.codechef.com/users/johndoe\n\nExperience:\n- Built REST APIs using Node.js\n- Developed React dashboards"}
                    value={resumeText}
                    onChange={e => setResumeText(e.target.value)}
                    style={{ resize: 'vertical' }}
                  />
                </div>
                <button className="btn btn-primary" onClick={handleParseResume} disabled={!resumeText.trim()}>
                  🤖 Analyze with AI
                </button>
              </div>
            )}

            {parsedResume && !isScanning && (
              <div className="glass-results">
                <div className="card" style={{ marginBottom: '1.5rem' }}>
                  <h3 style={{ marginBottom: '1rem' }}>✅ Analysis Results</h3>
                  <div style={{ marginBottom: '1rem' }}>
                    <h4 style={{ fontSize: '0.9rem', color: 'var(--text-light)', marginBottom: '8px' }}>Skills Detected ({parsedResume.skills.length})</h4>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                      {parsedResume.skills.map(s => <span key={s} className="skill-tag matched">{s}</span>)}
                      {parsedResume.skills.length === 0 && <p style={{ color: 'var(--danger)', fontSize: '0.9rem' }}>No skills detected. Add more content to your resume.</p>}
                    </div>
                  </div>

                  {/* Detected Profiles */}
                  {targetDomain !== 'Finance / Non-Tech' && (
                    <div style={{ marginBottom: '1rem' }}>
                      <h4 style={{ fontSize: '0.9rem', color: 'var(--text-light)', marginBottom: '8px' }}>🔗 Detected Profiles</h4>
                      {Object.entries(parsedResume.codingProfiles || {}).map(([key, val]) => (
                        <div key={key} style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                          <span style={{ fontWeight: 600, textTransform: 'capitalize', minWidth: '120px' }}>{key}:</span>
                          {val ? (
                            <a href={val} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--primary)', fontSize: '0.85rem' }}>{val}</a>
                          ) : (
                            <span style={{ color: 'var(--danger)', fontSize: '0.85rem' }}>❌ Not found — Add dynamically later.</span>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  <div style={{ display: 'flex', gap: '1rem' }}>
                    <button className="btn btn-primary" onClick={() => setTab('jobs')}>View Matching Jobs →</button>
                    <button className="btn btn-secondary" onClick={() => setTab('improve')}>View Skill Improvements →</button>
                  </div>
                </div>

                {/* Profile reminders */}
                {profileReminders.length > 0 && (
                  <div className="card" style={{ borderLeft: '4px solid var(--warning)' }}>
                    <h3 style={{ marginBottom: '0.75rem', color: 'var(--warning)' }}>⚠️ Missing Profile Links</h3>
                    <p style={{ color: 'var(--text-mid)', fontSize: '0.9rem', marginBottom: '1rem' }}>
                      Adding coding profile links to your resume helps recruiters evaluate you beyond just keywords.
                    </p>
                    {profileReminders.map((r, i) => (
                      <p key={i} style={{ fontSize: '0.85rem', color: 'var(--text-mid)', marginBottom: '4px' }}>{r}</p>
                    ))}
                    <button className="btn btn-secondary btn-sm" style={{ marginTop: '0.75rem' }} onClick={() => setTab('profiles')}>
                      Add Profiles Manually →
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ===== JOB BOARD ===== */}
        {tab === 'jobs' && (
          <div>
            <div className="dash-header">
              <h1>💼 Job Board</h1>
              <span style={{ color: 'var(--text-light)', fontSize: '0.9rem' }}>
                {getJobs().filter(j => j.status === 'Open').length} open positions
              </span>
            </div>

            {!parsedResume ? (
              <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
                <p style={{ fontSize: '1.1rem', color: 'var(--text-mid)', marginBottom: '1rem' }}>Upload your resume first to see personalized job recommendations.</p>
                <button className="btn btn-primary" onClick={() => setTab('resume')}>Go to Resume Scanner →</button>
              </div>
            ) : (
              <>
                <div style={{ marginBottom: '1rem', display: 'flex', gap: '0.5rem' }}>
                  <span className="badge badge-open">✅ Eligible ({recommendedJobs.filter(j => j.meetsRequirement).length})</span>
                  <span className="badge badge-below">⚠️ Below Cutoff ({recommendedJobs.filter(j => !j.meetsRequirement).length})</span>
                </div>
                <div className="card-grid">
                  {recommendedJobs.map(job => (
                    <div key={job.id} className="card job-card" style={{ borderLeftColor: job.meetsRequirement ? 'var(--success)' : 'var(--danger)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                        <div>
                          <div className="job-title">{job.title}</div>
                          <div className="job-company">{job.company} • {job.experience}</div>
                        </div>
                        <div className={`score-badge ${job.matchScore >= 70 ? 'high' : job.matchScore >= 40 ? 'mid' : 'low'}`}>
                          {job.matchScore}
                        </div>
                      </div>
                      <p style={{ fontSize: '0.85rem', color: 'var(--text-mid)', marginBottom: '0.75rem', lineHeight: '1.5' }}>{job.description}</p>
                      <div className="job-skills">
                        {job.skills.map(s => {
                          const has = parsedResume.skills.map(ps => ps.toLowerCase()).includes(s.toLowerCase());
                          return <span key={s} className={`skill-tag ${has ? 'matched' : 'missing'}`}>{s}</span>;
                        })}
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.75rem' }}>
                        <span style={{ fontSize: '0.8rem', color: 'var(--text-light)' }}>Cutoff: {job.cutoff}%</span>
                        {job.meetsRequirement ? (
                          <button className="btn btn-primary btn-sm" onClick={() => handleApply(job)}>Apply Now</button>
                        ) : (
                          <div>
                            <span className="badge badge-below" style={{ marginRight: '6px' }}>Below Cutoff</span>
                            <button className="btn btn-secondary btn-sm" onClick={() => setTab('improve')}>Improve Skills</button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        )}

        {/* ===== SKILL BOOST / COURSE RECOMMENDATIONS ===== */}
        {tab === 'improve' && (
          <div>
            <div className="dash-header"><h1>🚀 Skill Boost & Course Recommendations</h1></div>

            {courseRecs.length === 0 ? (
              <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
                <p style={{ fontSize: '1.1rem', color: 'var(--text-mid)', marginBottom: '1rem' }}>
                  Scan your resume first to identify skill gaps and get personalized course recommendations.
                </p>
                <button className="btn btn-primary" onClick={() => setTab('resume')}>Go to Resume Scanner →</button>
              </div>
            ) : (
              <>
                <div className="card" style={{ marginBottom: '1.5rem', borderLeft: '4px solid var(--accent-teal)' }}>
                  <h3 style={{ marginBottom: '0.5rem' }}>📈 Your Improvement Plan</h3>
                  <p style={{ color: 'var(--text-mid)', fontSize: '0.9rem' }}>
                    Based on your resume vs. open job requirements, we found <strong>{courseRecs.length} skill gaps</strong>.
                    Master these skills to unlock more job opportunities.
                  </p>
                </div>

                {courseRecs.map((rec, i) => (
                  <div key={rec.skill} className="card" style={{ marginBottom: '1rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
                      <div>
                        <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span className="skill-tag missing" style={{ fontSize: '0.85rem' }}>{rec.skill}</span>
                          <span style={{ fontSize: '0.85rem', color: 'var(--text-light)' }}>— Missing Skill #{i + 1}</span>
                        </h3>
                        <p style={{ color: 'var(--text-mid)', fontSize: '0.9rem', marginTop: '4px' }}>{rec.description}</p>
                      </div>
                    </div>

                    {/* Learning Roadmap */}
                    <div style={{ marginBottom: '1rem' }}>
                      <h4 style={{ fontSize: '0.85rem', color: 'var(--text-light)', marginBottom: '8px' }}>📍 Learning Roadmap</h4>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                        {rec.roadmap.map((step, si) => (
                          <span key={si} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <span style={{ background: 'var(--primary-bg)', color: 'var(--primary)', padding: '4px 10px', borderRadius: '12px', fontSize: '0.78rem', fontWeight: 500 }}>
                              {si + 1}. {step}
                            </span>
                            {si < rec.roadmap.length - 1 && <span style={{ color: 'var(--text-light)' }}>→</span>}
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Course Links */}
                    <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                      <a href={rec.youtube} target="_blank" rel="noopener noreferrer" className="btn btn-secondary btn-sm" style={{ color: '#FF0000', borderColor: '#FF000030' }}>
                        ▶️ YouTube Courses
                      </a>
                      <a href={rec.coursera} target="_blank" rel="noopener noreferrer" className="btn btn-secondary btn-sm" style={{ color: '#0056D2', borderColor: '#0056D230' }}>
                        🎓 Coursera Courses
                      </a>
                    </div>
                  </div>
                ))}
              </>
            )}
          </div>
        )}

        {/* ===== DYNAMIC PROFILES ===== */}
        {tab === 'profiles' && targetDomain !== 'Finance / Non-Tech' && (
          <div>
            <div className="dash-header"><h1>🔗 Dynamic Tech Profiles</h1></div>

            <div className="card" style={{ marginBottom: '1.5rem', borderLeft: '4px solid var(--primary)' }}>
              <h3 style={{ marginBottom: '0.5rem' }}>Why Add Professional Platforms?</h3>
              <p style={{ color: 'var(--text-mid)', fontSize: '0.9rem', lineHeight: '1.6' }}>
                Recruiters evaluate candidates beyond resumes. Links to Git repositories, competitive programming
                ranks, or specific project showcases dynamically scale up your overall "High Potential" rating.
                You can add ANY platform here.
              </p>
            </div>

            <div className="card">
              <h3 style={{ marginBottom: '1.5rem' }}>Your Platforms</h3>

              {Object.entries(codingProfiles).map(([key, val]) => (
                <div className="form-group" key={key}>
                  <label style={{ textTransform: 'capitalize' }}>{key} Profile URL</label>
                  <input type="text" placeholder={`https://${key}.com/yourname`} value={val} onChange={e => setCodingProfiles(p => ({ ...p, [key]: e.target.value }))} />
                </div>
              ))}

              <div style={{ background: 'var(--bg-body)', padding: '1rem', borderRadius: '8px', marginBottom: '1.5rem' }}>
                <h4 style={{ marginBottom: '1rem', fontSize: '0.95rem' }}>➕ Add New Dynamic Platform</h4>
                <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-end' }}>
                  <div className="form-group" style={{ marginBottom: 0, flex: 1 }}>
                    <label>Platform Name (e.g., Codeforces, Dribbble)</label>
                    <input type="text" placeholder="Platform Name" value={newProfileKey} onChange={e => setNewProfileKey(e.target.value)} />
                  </div>
                  <div className="form-group" style={{ marginBottom: 0, flex: 2 }}>
                    <label>Profile URL</label>
                    <input type="text" placeholder="https://..." value={newProfileUrl} onChange={e => setNewProfileUrl(e.target.value)} />
                  </div>
                  <button className="btn btn-secondary" onClick={handleAddCustomProfile}>Add</button>
                </div>
              </div>

              <button className="btn btn-primary" onClick={handleSaveProfiles}>💾 Auto-Save to Next Application</button>
            </div>
          </div>
        )}

        {/* ===== MY APPLICATIONS ===== */}
        {tab === 'applications' && (
          <div>
            <div className="dash-header"><h1>📋 My Applications</h1></div>
            {myApplications.length === 0 ? (
              <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
                <p style={{ color: 'var(--text-mid)' }}>You haven't applied to any jobs yet.</p>
                <button className="btn btn-primary" style={{ marginTop: '1rem' }} onClick={() => setTab('jobs')}>Browse Jobs →</button>
              </div>
            ) : (
              <div className="card">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Job</th>
                      <th>Score</th>
                      <th>Status</th>
                      <th>Forwarded</th>
                      <th>Applied</th>
                    </tr>
                  </thead>
                  <tbody>
                    {myApplications.map(app => {
                      const allJobs = getJobs();
                      const job = allJobs.find(j => j.id === app.jobId);
                      return (
                        <tr key={app.id}>
                          <td style={{ fontWeight: 600 }}>{job ? job.title : app.jobId}</td>
                          <td>
                            <span className={`score-badge ${app.score >= 70 ? 'high' : app.score >= 40 ? 'mid' : 'low'}`} style={{ width: '36px', height: '36px', fontSize: '0.85rem' }}>
                              {app.score}
                            </span>
                          </td>
                          <td>
                            <span className={`badge ${app.status === 'Shortlisted' ? 'badge-shortlisted' : 'badge-below'}`}>{app.status}</span>
                          </td>
                          <td>
                            {app.forwardedToRecruiters ? (
                              <span style={{ color: 'var(--success)', fontWeight: 600 }}>✅ Yes</span>
                            ) : (
                              <span style={{ color: 'var(--text-light)' }}>—</span>
                            )}
                          </td>
                          <td style={{ color: 'var(--text-light)' }}>{app.appliedDate}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ===== INTERVIEWS ===== */}
        {tab === 'interviews' && (
          <div>
            <div className="dash-header"><h1>🎤 My Interviews</h1></div>
            {interviews.length === 0 ? (
              <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
                <p style={{ color: 'var(--text-mid)' }}>No interviews scheduled yet. Apply to jobs and get shortlisted!</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {interviews.map(intv => {
                  const job = getJobs().find(j => j.id === intv.jobId);
                  return (
                    <div key={intv.id} className="card" style={{ borderLeft: '4px solid var(--primary)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div>
                          <h3>{intv.type}</h3>
                          <p style={{ color: 'var(--text-light)', fontSize: '0.9rem' }}>
                            {job ? job.title : 'Unknown Job'} • {job ? job.company : ''}
                          </p>
                          <p style={{ color: 'var(--text-mid)', fontSize: '0.9rem', marginTop: '4px' }}>
                            📅 {intv.date} • ⏰ {intv.time}
                          </p>
                          {intv.notes && <p style={{ color: 'var(--text-mid)', fontSize: '0.85rem', marginTop: '4px' }}>📝 {intv.notes}</p>}
                        </div>
                        <a href={intv.meetLink} target="_blank" rel="noopener noreferrer" className="btn btn-primary btn-sm">
                          Join Google Meet 🔗
                        </a>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ===== NOTIFICATIONS ===== */}
        {tab === 'notifications' && (
          <div>
            <div className="dash-header">
              <h1>🔔 Notifications</h1>
              <span style={{ color: 'var(--text-light)', fontSize: '0.9rem' }}>{unreadCount} unread</span>
            </div>
            {notifications.length === 0 ? (
              <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
                <p style={{ color: 'var(--text-mid)' }}>No notifications yet. New job postings will appear here!</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {notifications.map(n => (
                  <div key={n.id} className="card" style={{
                    borderLeft: `4px solid ${n.type === 'new_job' ? 'var(--primary)' : n.type === 'interview_scheduled' ? 'var(--accent-teal)' : 'var(--success)'}`,
                    opacity: n.read ? 0.7 : 1,
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div>
                        <h4 style={{ marginBottom: '4px' }}>
                          {n.type === 'new_job' ? '💼' : n.type === 'interview_scheduled' ? '🎤' : '🚀'} {n.title}
                        </h4>
                        <p style={{ color: 'var(--text-mid)', fontSize: '0.9rem', lineHeight: '1.5' }}>{n.message}</p>
                        <span style={{ color: 'var(--text-light)', fontSize: '0.8rem' }}>{n.date}</span>
                      </div>
                      {!n.read && (
                        <button className="btn btn-secondary btn-sm" onClick={() => handleMarkRead(n.id)}>
                          Mark Read
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
