import React, { useState, useEffect } from 'react';
import {
  getJobs, createJob, updateJobCutoff, bulkScanResumes,
  getApplicationsByJob, getNotifications, markNotificationRead,
  getUnreadCount, scheduleInterview, getInterviewsByJob,
  generateJobDescription, evaluateCandidate
} from './store';

export default function HRDashboard({ user, onLogout }) {
  const [tab, setTab] = useState('dashboard');
  const [jobs, setJobs] = useState([]);
  const [selectedJob, setSelectedJob] = useState(null);
  const [showNewJob, setShowNewJob] = useState(false);
  const [scanResults, setScanResults] = useState([]);
  const [jobApplicants, setJobApplicants] = useState([]);
  const [newCutoff, setNewCutoff] = useState('');
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [interviews, setInterviews] = useState([]);
  const [showSchedule, setShowSchedule] = useState(null); // applicationId
  const [scheduleForm, setScheduleForm] = useState({ date: '', time: '', type: 'Coding Round', notes: '', meetLink: '' });
  
  const [showEvaluation, setShowEvaluation] = useState(null); // applicationId
  const [evalForm, setEvalForm] = useState({ score: '', feedback: '', action: 'None' });

  const [bulkText, setBulkText] = useState('');
  const [jobForm, setJobForm] = useState({ title: '', description: '', skills: '', experience: '', cutoff: 60 });
  const [successMsg, setSuccessMsg] = useState('');

  useEffect(() => {
    refreshData();
    const interval = setInterval(refreshData, 5000);
    return () => clearInterval(interval);
  }, [user.id]);

  const refreshData = () => {
    setJobs(getJobs());
    setNotifications(getNotifications(user.id));
    setUnreadCount(getUnreadCount(user.id));
  };

  const handleCreateJob = (e) => {
    e.preventDefault();
    const skillsArr = jobForm.skills.split(',').map(s => s.trim()).filter(Boolean);
    createJob({
      title: jobForm.title, description: jobForm.description,
      skills: skillsArr, experience: jobForm.experience,
      cutoff: Number(jobForm.cutoff), company: user.company || 'NexHire Corp',
      postedBy: user.id,
    });
    setJobForm({ title: '', description: '', skills: '', experience: '', cutoff: 60 });
    setShowNewJob(false);
    refreshData();
    setSuccessMsg('Job posted! All registered students have been notified.');
    setTimeout(() => setSuccessMsg(''), 4000);
  };

  const handleGenerateJD = () => {
    if (!jobForm.title) {
      alert("Please enter a job title first.");
      return;
    }
    const skillsArr = jobForm.skills.split(',').map(s => s.trim()).filter(Boolean);
    const generated = generateJobDescription(jobForm.title, skillsArr, jobForm.experience);
    setJobForm(p => ({ ...p, description: generated }));
    setSuccessMsg('Job Description auto-generated successfully!');
    setTimeout(() => setSuccessMsg(''), 3000);
  };

  const handleSelectJob = (job) => {
    setSelectedJob(job);
    setNewCutoff(job.cutoff);
    setScanResults([]);
    setJobApplicants(getApplicationsByJob(job.id));
    setInterviews(getInterviewsByJob(job.id));
  };

  const handleUpdateCutoff = () => {
    if (selectedJob && newCutoff) {
      updateJobCutoff(selectedJob.id, Number(newCutoff));
      refreshData();
      const updated = getJobs().find(j => j.id === selectedJob.id);
      setSelectedJob(updated);
      setJobApplicants(getApplicationsByJob(selectedJob.id));
    }
  };

  const handleBulkScan = (e) => {
    const files = Array.from(e.target.files);
    if (!files.length || !selectedJob) return;
    const promises = files.map(file => {
      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = (ev) => resolve({ fileName: file.name, text: ev.target.result });
        reader.readAsText(file);
      });
    });
    Promise.all(promises).then(resumes => {
      setScanResults(bulkScanResumes(selectedJob.id, resumes));
    });
  };

  const handleBulkTextScan = () => {
    if (!bulkText.trim() || !selectedJob) return;
    const sections = bulkText.split('---').filter(s => s.trim());
    const resumes = sections.map((text, i) => ({ fileName: `Resume_${i + 1}`, text }));
    setScanResults(bulkScanResumes(selectedJob.id, resumes));
  };

  const handleScheduleInterview = (appId) => {
    const res = scheduleInterview(appId, user.id, scheduleForm);
    if (res.success) {
      setShowSchedule(null);
      setScheduleForm({ date: '', time: '', type: 'Coding Round', notes: '', meetLink: '' });
      if (selectedJob) {
        setJobApplicants(getApplicationsByJob(selectedJob.id));
        setInterviews(getInterviewsByJob(selectedJob.id));
      }
      setSuccessMsg('Interview scheduled! Student has been notified with Google Meet link.');
      setTimeout(() => setSuccessMsg(''), 4000);
    }
  };

  const handleEvaluate = (appId) => {
    if (!evalForm.score) { alert('Please provide an interview score.'); return; }
    const res = evaluateCandidate(appId, user.role, user.name, evalForm.score, evalForm.feedback, evalForm.action, evalForm.feedback);
    if (res.success) {
       setShowEvaluation(null);
       setEvalForm({ score: '', feedback: '', action: 'None' });
       if (selectedJob) setJobApplicants(getApplicationsByJob(selectedJob.id));
       setSuccessMsg(`${user.role} evaluation recorded successfully!`);
       setTimeout(() => setSuccessMsg(''), 4000);
    }
  };

  const handleMarkRead = (id) => {
    markNotificationRead(id);
    refreshData();
  };

  const initials = user.name ? user.name.split(' ').map(w => w[0]).join('').toUpperCase() : '?';

  return (
    <div className="dashboard">
      <aside className="sidebar">
        <div className="sidebar-logo">
          <img src="/logo.jpg" alt="NexHire AI" style={{ height: '40px', objectFit: 'contain' }} />
        </div>
        <nav className="sidebar-nav">
          <button className={tab === 'dashboard' ? 'active' : ''} onClick={() => setTab('dashboard')}>
            <span>📊</span> <span>Dashboard</span>
          </button>
          <button className={tab === 'jobs' ? 'active' : ''} onClick={() => setTab('jobs')}>
            <span>📋</span> <span>Job Postings</span>
          </button>
          <button className={tab === 'scan' ? 'active' : ''} onClick={() => setTab('scan')}>
            <span>🔍</span> <span>Scan Resumes</span>
          </button>
          <button className={tab === 'candidates' ? 'active' : ''} onClick={() => setTab('candidates')}>
            <span>👥</span> <span>Candidates</span>
          </button>
          <button className={tab === 'schedule' ? 'active' : ''} onClick={() => setTab('schedule')}>
            <span>📅</span> <span>Interviews</span>
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

      <div className="dash-main">
        <div className="credentials-panel">
          <h4>🔐 Your Session Credentials</h4>
          <div className="cred-row"><span className="cred-label">Name</span><span className="cred-value">{user.name}</span></div>
          <div className="cred-row"><span className="cred-label">Email</span><span className="cred-value">{user.email}</span></div>
          <div className="cred-row"><span className="cred-label">Role</span><span className="cred-value">{user.role}</span></div>
          {user.company && <div className="cred-row"><span className="cred-label">Company</span><span className="cred-value">{user.company}</span></div>}
        </div>

        {successMsg && (
          <div style={{ background: 'var(--success-bg)', color: 'var(--success)', padding: '12px 16px', borderRadius: '8px', marginBottom: '1rem', fontWeight: 600, fontSize: '0.9rem' }}>
            ✅ {successMsg}
          </div>
        )}

        {/* ===== DASHBOARD ===== */}
        {tab === 'dashboard' && (
          <div>
            <div className="dash-header">
              <div>
                <h1>Welcome, {user.name}! 👋</h1>
                <p style={{ color: 'var(--text-light)', marginTop: '4px' }}>HR Control Panel — {user.role}</p>
              </div>
              <div className="profile-avatar">{initials}</div>
            </div>
            <div className="stat-row">
              <div className="stat-card">
                <div className="stat-icon" style={{ background: 'var(--primary-bg)', color: 'var(--primary)' }}>📋</div>
                <div className="stat-value">{jobs.length}</div>
                <div className="stat-label">Active Jobs</div>
              </div>
              <div className="stat-card">
                <div className="stat-icon" style={{ background: 'var(--success-bg)', color: 'var(--success)' }}>👥</div>
                <div className="stat-value">{jobs.reduce((sum, j) => sum + j.applicants.length, 0)}</div>
                <div className="stat-label">Total Applicants</div>
              </div>
              <div className="stat-card">
                <div className="stat-icon" style={{ background: 'var(--accent-orange-bg)', color: 'var(--accent-orange)' }}>🔔</div>
                <div className="stat-value">{unreadCount}</div>
                <div className="stat-label">New Alerts</div>
              </div>
              <div className="stat-card">
                <div className="stat-icon" style={{ background: 'var(--accent-pink-bg)', color: 'var(--accent-pink)' }}>📅</div>
                <div className="stat-value">{jobs.reduce((sum, j) => sum + getInterviewsByJob(j.id).length, 0)}</div>
                <div className="stat-label">Interviews</div>
              </div>
            </div>
            <div className="card">
              <h3 style={{ marginBottom: '0.75rem' }}>🚀 Quick Actions</h3>
              <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                <button className="btn btn-primary" onClick={() => { setTab('jobs'); setShowNewJob(true); }}>+ Post New Job</button>
                <button className="btn btn-secondary" onClick={() => setTab('scan')}>🔍 Scan Resumes</button>
                <button className="btn btn-secondary" onClick={() => setTab('candidates')}>👥 View Candidates</button>
                <button className="btn btn-secondary" onClick={() => setTab('notifications')}>🔔 Notifications ({unreadCount})</button>
              </div>
            </div>
          </div>
        )}

        {/* ===== JOB POSTINGS ===== */}
        {tab === 'jobs' && (
          <div>
            <div className="dash-header">
              <h1>📋 Job Postings</h1>
              <button className="btn btn-primary" onClick={() => setShowNewJob(true)}>+ Create Job</button>
            </div>

            {showNewJob && (
              <div className="modal-overlay" onClick={() => setShowNewJob(false)}>
                <div className="modal-box" onClick={e => e.stopPropagation()}>
                  <h2 style={{ marginBottom: '0.5rem' }}>Create New Job Posting</h2>
                  <p style={{ color: 'var(--text-light)', marginBottom: '1.5rem', fontSize: '0.9rem' }}>
                    All registered students will be automatically notified about this job.
                  </p>
                  <form onSubmit={handleCreateJob}>
                    <div className="form-group">
                      <label>Job Title</label>
                      <input type="text" placeholder="e.g., Frontend Developer" value={jobForm.title} onChange={e => setJobForm(p => ({...p, title: e.target.value}))} required />
                    </div>
                    <div className="form-group">
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                        <label style={{ margin: 0 }}>Description</label>
                        <button type="button" className="btn btn-secondary btn-sm" onClick={handleGenerateJD} style={{ padding: '2px 8px', fontSize: '0.75rem', border: '1px solid var(--primary)', color: 'var(--primary)' }}>
                          ✨ AI Suggest JD
                        </button>
                      </div>
                      <textarea rows={6} placeholder="Describe the role or auto-generate..." value={jobForm.description} onChange={e => setJobForm(p => ({...p, description: e.target.value}))} required />
                    </div>
                    <div className="form-group">
                      <label>Required Skills (comma separated)</label>
                      <input type="text" placeholder="React, JavaScript, CSS, Node.js" value={jobForm.skills} onChange={e => setJobForm(p => ({...p, skills: e.target.value}))} required />
                    </div>
                    <div style={{ display: 'flex', gap: '1rem' }}>
                      <div className="form-group" style={{ flex: 1 }}>
                        <label>Experience</label>
                        <input type="text" placeholder="0-2 years" value={jobForm.experience} onChange={e => setJobForm(p => ({...p, experience: e.target.value}))} />
                      </div>
                      <div className="form-group" style={{ flex: 1 }}>
                        <label>Cutoff Score (%)</label>
                        <input type="number" min="0" max="100" value={jobForm.cutoff} onChange={e => setJobForm(p => ({...p, cutoff: e.target.value}))} />
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                      <button type="submit" className="btn btn-primary btn-full">Create & Notify Students</button>
                      <button type="button" className="btn btn-secondary" onClick={() => setShowNewJob(false)}>Cancel</button>
                    </div>
                  </form>
                </div>
              </div>
            )}

            <div className="card-grid">
              {jobs.map(job => (
                <div key={job.id} className="card job-card" onClick={() => handleSelectJob(job)} style={{ cursor: 'pointer', borderLeftColor: selectedJob?.id === job.id ? 'var(--accent-teal)' : 'var(--primary)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <div className="job-title">{job.title}</div>
                      <div className="job-company">{job.company} • {job.experience}</div>
                    </div>
                    <span className="badge badge-open">{job.status}</span>
                  </div>
                  <div className="job-skills" style={{ marginTop: '0.5rem' }}>
                    {job.skills.map(s => <span key={s} className="skill-tag neutral">{s}</span>)}
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: 'var(--text-light)', marginTop: '0.5rem' }}>
                    <span>Cutoff: {job.cutoff}%</span>
                    <span>{job.applicants.length} applicant(s)</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ===== SCAN RESUMES ===== */}
        {tab === 'scan' && (
          <div>
            <div className="dash-header"><h1>🔍 Bulk Resume Scanner</h1></div>

            <div className="card" style={{ marginBottom: '1.5rem' }}>
              <h3 style={{ marginBottom: '1rem' }}>1. Select Job to Match Against</h3>
              <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                {jobs.map(job => (
                  <button key={job.id} className={`btn ${selectedJob?.id === job.id ? 'btn-primary' : 'btn-secondary'} btn-sm`} onClick={() => handleSelectJob(job)}>
                    {job.title} (Cutoff: {job.cutoff}%)
                  </button>
                ))}
              </div>
            </div>

            {selectedJob && (
              <>
                <div className="card" style={{ marginBottom: '1.5rem' }}>
                  <h3 style={{ marginBottom: '1rem' }}>⚙️ Adjust Cutoff for "{selectedJob.title}"</h3>
                  <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-end' }}>
                    <div className="form-group" style={{ marginBottom: 0, flex: 1 }}>
                      <label>Cutoff Score (%)</label>
                      <input type="number" min="0" max="100" value={newCutoff} onChange={e => setNewCutoff(e.target.value)} />
                    </div>
                    <button className="btn btn-primary btn-sm" onClick={handleUpdateCutoff}>Update Cutoff</button>
                  </div>
                </div>

                <div className="card" style={{ marginBottom: '1.5rem' }}>
                  <h3 style={{ marginBottom: '1rem' }}>2. Upload Multiple Resumes</h3>
                  <div className="upload-zone" onClick={() => document.getElementById('bulk-upload').click()}>
                    <div className="upload-icon">📁</div>
                    <h4>Click to upload resume files (.txt)</h4>
                    <p style={{ color: 'var(--text-light)', fontSize: '0.85rem' }}>Select multiple TXT files at once</p>
                    <input type="file" id="bulk-upload" multiple accept=".txt" style={{ display: 'none' }} onChange={handleBulkScan} />
                  </div>
                  <div style={{ margin: '1.5rem 0', textAlign: 'center', color: 'var(--text-light)' }}>— OR paste resumes separated by --- —</div>
                  <div className="form-group">
                    <label>Paste Multiple Resumes (separate each with ---)</label>
                    <textarea rows={8} placeholder={"Resume 1 content...\nSkills: React, JavaScript\n---\nResume 2 content...\nSkills: Python, Machine Learning"} value={bulkText} onChange={e => setBulkText(e.target.value)} style={{ resize: 'vertical' }} />
                  </div>
                  <button className="btn btn-primary" onClick={handleBulkTextScan} disabled={!bulkText.trim()}>🤖 Scan All Resumes</button>
                </div>
              </>
            )}

            {scanResults.length > 0 && (
              <div className="card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                  <h3>📊 Scan Results — Sorted by Score</h3>
                  <span style={{ color: 'var(--text-light)', fontSize: '0.85rem' }}>
                    {scanResults.filter(r => r.meetsRequirement).length} of {scanResults.length} meet cutoff ({selectedJob.cutoff}%)
                  </span>
                </div>
                <div style={{ overflowX: 'auto' }}>
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>#</th>
                        <th>Resume</th>
                        <th>Name</th>
                        <th>Score</th>
                        <th>Matched</th>
                        <th>Missing</th>
                        <th>Profiles</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {scanResults.map((r, i) => (
                        <tr key={i} style={{ background: r.meetsRequirement ? 'rgba(16,185,129,0.03)' : 'rgba(239,68,68,0.03)' }}>
                          <td style={{ fontWeight: 700, color: 'var(--text-light)' }}>{i + 1}</td>
                          <td style={{ fontSize: '0.85rem' }}>{r.fileName}</td>
                          <td style={{ fontWeight: 600 }}>{r.name}</td>
                          <td>
                            <span className={`score-badge ${r.score >= 70 ? 'high' : r.score >= 40 ? 'mid' : 'low'}`} style={{ width: '40px', height: '40px', fontSize: '0.85rem' }}>{r.score}</span>
                          </td>
                          <td><div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>{r.matchedSkills.map(s => <span key={s} className="skill-tag matched">{s}</span>)}</div></td>
                          <td><div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>{r.missingSkills.map(s => <span key={s} className="skill-tag missing">{s}</span>)}</div></td>
                          <td>
                            {r.codingProfiles && Object.entries(r.codingProfiles).filter(([,v]) => v).map(([k, v]) => (
                              <a key={k} href={v} target="_blank" rel="noopener noreferrer" style={{ display: 'block', color: 'var(--primary)', fontSize: '0.78rem' }}>
                                {k}
                              </a>
                            ))}
                            {r.codingProfiles && Object.values(r.codingProfiles).filter(Boolean).length === 0 && <span style={{ fontSize: '0.8rem', color: 'var(--text-light)' }}>None</span>}
                          </td>
                          <td><span className={`badge ${r.meetsRequirement ? 'badge-shortlisted' : 'badge-below'}`}>{r.meetsRequirement ? 'Pass' : 'Below'}</span></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ===== CANDIDATES ===== */}
        {tab === 'candidates' && (
          <div>
            <div className="dash-header"><h1>👥 Candidates</h1></div>
            <div className="card" style={{ marginBottom: '1.5rem' }}>
              <h3 style={{ marginBottom: '1rem' }}>Select a Job</h3>
              <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                {jobs.map(job => (
                  <button key={job.id} className={`btn ${selectedJob?.id === job.id ? 'btn-primary' : 'btn-secondary'} btn-sm`} onClick={() => handleSelectJob(job)}>
                    {job.title} ({job.applicants.length})
                  </button>
                ))}
              </div>
            </div>

            {selectedJob && jobApplicants.length > 0 && (
              <div className="card">
                <h3 style={{ marginBottom: '1rem' }}>Applicants for "{selectedJob.title}" — Sorted by Score</h3>
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Rank</th>
                      <th>Candidate</th>
                      <th>Email</th>
                      <th>Score</th>
                      <th>Status</th>
                      <th>Forwarded</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {jobApplicants.map((app, i) => (
                      <tr key={app.id}>
                        <td style={{ fontWeight: 700 }}>#{i + 1}</td>
                        <td style={{ fontWeight: 600 }}>{app.studentName || 'Unknown'}</td>
                        <td style={{ fontSize: '0.85rem', color: 'var(--text-mid)' }}>{app.studentEmail}</td>
                        <td>
                          <span className={`score-badge ${app.score >= 70 ? 'high' : app.score >= 40 ? 'mid' : 'low'}`} style={{ width: '36px', height: '36px', fontSize: '0.85rem' }}>{app.score}</span>
                          {app.overallScore && (
                            <div style={{ fontSize: '0.75rem', marginTop: '4px', textAlign: 'center', fontWeight: 'bold' }}>Ov: {app.overallScore}%</div>
                          )}
                        </td>
                        <td>
                          <span className={`badge ${app.status.includes('Hired') ? 'badge-shortlisted' : app.status.includes('Rejected') ? 'badge-below' : 'badge-open'}`}>{app.status}</span>
                          {app.xaiFlag && <div style={{ fontSize: '0.8rem', marginTop: '6px', fontWeight: 'bold' }}>{app.xaiFlag}</div>}
                        </td>
                        <td>{app.forwardedToRecruiters ? <span style={{ color: 'var(--success)' }}>✅</span> : '—'}</td>
                        <td>
                          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                            {app.status === 'Shortlisted' && (
                              <button className="btn btn-primary btn-sm" onClick={() => setShowSchedule(app.id)}>
                                📅 Mng Interview
                              </button>
                            )}
                            <button className="btn btn-secondary btn-sm" onClick={() => setShowEvaluation(app.id)}>
                              ⚖️ Evaluate & Decide
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {selectedJob && jobApplicants.length === 0 && (
              <div className="card" style={{ textAlign: 'center', padding: '2rem' }}>
                <p style={{ color: 'var(--text-mid)' }}>No applicants for this job yet.</p>
              </div>
            )}

            {/* Schedule Interview Modal */}
            {showSchedule && (
              <div className="modal-overlay" onClick={() => setShowSchedule(null)}>
                <div className="modal-box" onClick={e => e.stopPropagation()}>
                  <h2 style={{ marginBottom: '0.5rem' }}>📅 Schedule Interview</h2>
                  <p style={{ color: 'var(--text-light)', marginBottom: '1.5rem', fontSize: '0.9rem' }}>
                    The student will be notified with the Google Meet link automatically.
                  </p>
                  <div className="form-group">
                    <label>Interview Type</label>
                    <select value={scheduleForm.type} onChange={e => setScheduleForm(p => ({...p, type: e.target.value}))}>
                      <option>Coding Round</option>
                      <option>Technical Interview</option>
                      <option>HR Interview</option>
                      <option>System Design Round</option>
                      <option>Behavioral Interview</option>
                    </select>
                  </div>
                  <div style={{ display: 'flex', gap: '1rem' }}>
                    <div className="form-group" style={{ flex: 1 }}>
                      <label>Date</label>
                      <input type="date" value={scheduleForm.date} onChange={e => setScheduleForm(p => ({...p, date: e.target.value}))} />
                    </div>
                    <div className="form-group" style={{ flex: 1 }}>
                      <label>Time</label>
                      <input type="time" value={scheduleForm.time} onChange={e => setScheduleForm(p => ({...p, time: e.target.value}))} />
                    </div>
                  </div>
                  <div className="form-group">
                    <label>Google Meet Link (optional — auto-generated if empty)</label>
                    <input type="text" placeholder="https://meet.google.com/abc-defg-hij" value={scheduleForm.meetLink} onChange={e => setScheduleForm(p => ({...p, meetLink: e.target.value}))} />
                  </div>
                  <div className="form-group">
                    <label>Notes for Candidate</label>
                    <textarea rows={2} placeholder="e.g., Prepare for DSA questions" value={scheduleForm.notes} onChange={e => setScheduleForm(p => ({...p, notes: e.target.value}))} />
                  </div>
                  <div style={{ display: 'flex', gap: '1rem' }}>
                    <button className="btn btn-primary btn-full" onClick={() => handleScheduleInterview(showSchedule)}>
                      Schedule & Notify Student
                    </button>
                    <button className="btn btn-secondary" onClick={() => setShowSchedule(null)}>Cancel</button>
                  </div>
                </div>
              </div>
            )}

            {/* Evaluate Candidate Modal */}
            {showEvaluation && (() => {
              const activeApp = jobApplicants.find(a => a.id === showEvaluation);
              if (!activeApp) return null;
              return (
                <div className="modal-overlay" onClick={() => setShowEvaluation(null)}>
                  <div className="modal-box" style={{ maxWidth: '650px' }} onClick={e => e.stopPropagation()}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
                      <h2 style={{ margin: 0 }}>⚖️ Evaluate: {activeApp.studentName}</h2>
                      {activeApp.xaiFlag && <span style={{ fontSize: '1.2rem' }}>{activeApp.xaiFlag}</span>}
                    </div>

                    {/* Explainable AI Card */}
                    <div className="card" style={{ background: 'var(--primary-bg)', border: 'none', padding: '1rem', marginBottom: '1.5rem' }}>
                      <h4 style={{ color: 'var(--primary)', marginBottom: '0.5rem' }}>🤖 Explainable AI (XAI) Insight</h4>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        {activeApp.xaiSummary && activeApp.xaiSummary.length > 0 ? (
                          activeApp.xaiSummary.map((msg, idx) => (
                            <span key={idx} style={{ fontSize: '0.85rem', color: 'var(--text-mid)' }}>{msg}</span>
                          ))
                        ) : (
                          <span style={{ fontSize: '0.85rem', color: 'var(--text-light)' }}>Not enough data for AI insight yet. Add evaluations to unlock.</span>
                        )}
                      </div>
                    </div>

                    {/* Evaluation History */}
                    {activeApp.evaluations && activeApp.evaluations.length > 0 && (
                      <div style={{ marginBottom: '1.5rem' }}>
                        <h4 style={{ marginBottom: '0.5rem', fontSize: '0.9rem' }}>Previous Evaluations</h4>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '150px', overflowY: 'auto' }}>
                          {activeApp.evaluations.map((ev, idx) => (
                            <div key={idx} style={{ padding: '8px', background: 'var(--bg-body)', borderRadius: '6px', fontSize: '0.85rem' }}>
                              <strong>{ev.evaluatorRole} ({ev.evaluatorName})</strong> — Score: {ev.interviewScore}/100<br/>
                              <span style={{ color: 'var(--text-mid)' }}>“{ev.feedback}”</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Form for Active User */}
                    <h4 style={{ marginBottom: '0.5rem', fontSize: '0.9rem' }}>Submit Your Evaluation as {user.role}</h4>
                    <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem' }}>
                      <div className="form-group" style={{ flex: 1, marginBottom: 0 }}>
                        <label>Interview Score (0-100)</label>
                        <input type="number" min="0" max="100" placeholder="e.g., 85" value={evalForm.score} onChange={e => setEvalForm(p => ({...p, score: e.target.value}))} />
                      </div>
                      <div className="form-group" style={{ flex: 1, marginBottom: 0 }}>
                        <label>Final Action (Optional)</label>
                        <select value={evalForm.action} onChange={e => setEvalForm(p => ({...p, action: e.target.value}))}>
                          <option value="None">Leave Pending</option>
                          <option value="Hire">Hire 🏆</option>
                          <option value="Reject">Reject ❌</option>
                        </select>
                      </div>
                    </div>
                    <div className="form-group">
                      <label>Feedback & Notes</label>
                      <textarea rows={2} placeholder="Explain your score and decision..." value={evalForm.feedback} onChange={e => setEvalForm(p => ({...p, feedback: e.target.value}))} />
                    </div>

                    <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                      <button className="btn btn-primary btn-full" onClick={() => handleEvaluate(showEvaluation)}>
                        Save Evaluation
                      </button>
                      <button className="btn btn-secondary" onClick={() => setShowEvaluation(null)}>Cancel</button>
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>
        )}

        {/* ===== SCHEDULED INTERVIEWS ===== */}
        {tab === 'schedule' && (
          <div>
            <div className="dash-header"><h1>📅 Scheduled Interviews</h1></div>
            <div className="card" style={{ marginBottom: '1.5rem' }}>
              <h3 style={{ marginBottom: '1rem' }}>Select a Job</h3>
              <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                {jobs.map(job => (
                  <button key={job.id} className={`btn ${selectedJob?.id === job.id ? 'btn-primary' : 'btn-secondary'} btn-sm`} onClick={() => handleSelectJob(job)}>
                    {job.title}
                  </button>
                ))}
              </div>
            </div>

            {selectedJob && interviews.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {interviews.map(intv => (
                  <div key={intv.id} className="card" style={{ borderLeft: '4px solid var(--accent-teal)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div>
                        <h3>{intv.studentName}</h3>
                        <p style={{ color: 'var(--text-light)', fontSize: '0.9rem' }}>{intv.type} • {intv.date} at {intv.time}</p>
                        {intv.notes && <p style={{ color: 'var(--text-mid)', fontSize: '0.85rem', marginTop: '4px' }}>📝 {intv.notes}</p>}
                      </div>
                      <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                        <span className="badge badge-shortlisted">{intv.status}</span>
                        <a href={intv.meetLink} target="_blank" rel="noopener noreferrer" className="btn btn-primary btn-sm">
                          Open Meet 🔗
                        </a>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {selectedJob && interviews.length === 0 && (
              <div className="card" style={{ textAlign: 'center', padding: '2rem' }}>
                <p style={{ color: 'var(--text-mid)' }}>No interviews scheduled for this job yet.</p>
              </div>
            )}
          </div>
        )}

        {/* ===== NOTIFICATIONS ===== */}
        {tab === 'notifications' && (
          <div>
            <div className="dash-header">
              <h1>🔔 Notifications</h1>
              <span style={{ color: 'var(--text-light)' }}>{unreadCount} unread</span>
            </div>
            {notifications.length === 0 ? (
              <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
                <p style={{ color: 'var(--text-mid)' }}>No notifications yet.</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {notifications.map(n => (
                  <div key={n.id} className="card" style={{ borderLeft: `4px solid ${n.type === 'eligible_candidate' ? 'var(--success)' : 'var(--primary)'}`, opacity: n.read ? 0.7 : 1 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div>
                        <h4 style={{ marginBottom: '4px' }}>{n.type === 'eligible_candidate' ? '🏆' : '📋'} {n.title}</h4>
                        <p style={{ color: 'var(--text-mid)', fontSize: '0.9rem', lineHeight: '1.5' }}>{n.message}</p>
                        <span style={{ color: 'var(--text-light)', fontSize: '0.8rem' }}>{n.date}</span>
                      </div>
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        {!n.read && <button className="btn btn-secondary btn-sm" onClick={() => handleMarkRead(n.id)}>Mark Read</button>}
                        {n.type === 'eligible_candidate' && (
                          <button className="btn btn-primary btn-sm" onClick={() => { setTab('candidates'); if (n.jobId) { const j = getJobs().find(jj => jj.id === n.jobId); if (j) handleSelectJob(j); } }}>
                            View Candidate
                          </button>
                        )}
                      </div>
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
