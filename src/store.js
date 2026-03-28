// store.js - Complete localStorage-based database for NexHire AI

const DB_KEY = 'nexhire_db';

function getDB() {
  const raw = localStorage.getItem(DB_KEY);
  if (raw) return JSON.parse(raw);
  const seed = {
    users: [
      { id: 'hr1', email: 'hr@nexhire.com', password: 'hr123', name: 'Priya Sharma', role: 'HR', company: 'TechCorp India' },
      { id: 'tl1', email: 'techlead@nexhire.com', password: 'tl123', name: 'Arjun Mehta', role: 'Tech Lead', company: 'TechCorp India' },
      { id: 'mgr1', email: 'manager@nexhire.com', password: 'mgr123', name: 'Ravi Kumar', role: 'Manager', company: 'TechCorp India' },
    ],
    jobs: [
      {
        id: 'job1', title: 'Frontend Developer', company: 'TechCorp India', postedBy: 'hr1',
        description: 'Build modern web applications using React, JavaScript, and CSS.',
        skills: ['React', 'JavaScript', 'CSS', 'HTML', 'TypeScript', 'Git'],
        experience: '0-2 years', cutoff: 60, status: 'Open', postedDate: '2026-03-20',
        applicants: []
      },
      {
        id: 'job2', title: 'Backend Engineer', company: 'TechCorp India', postedBy: 'hr1',
        description: 'Design and build scalable APIs using Node.js, Python, and databases.',
        skills: ['Python', 'Node.js', 'SQL', 'REST API', 'Docker', 'AWS'],
        experience: '1-3 years', cutoff: 65, status: 'Open', postedDate: '2026-03-22',
        applicants: []
      },
      {
        id: 'job3', title: 'Data Scientist', company: 'TechCorp India', postedBy: 'hr1',
        description: 'Analyze data and build ML models for business insights.',
        skills: ['Python', 'Machine Learning', 'TensorFlow', 'SQL', 'Statistics', 'Pandas'],
        experience: '2-4 years', cutoff: 70, status: 'Open', postedDate: '2026-03-25',
        applicants: []
      },
    ],
    applications: [],
    notifications: [],
    interviews: [],
    profiles: {}, // coding profiles keyed by userId
  };
  localStorage.setItem(DB_KEY, JSON.stringify(seed));
  return seed;
}

function saveDB(db) {
  localStorage.setItem(DB_KEY, JSON.stringify(db));
}

// ========== AUTH ==========
export function registerUser(userData) {
  const db = getDB();
  const exists = db.users.find(u => u.email === userData.email);
  if (exists) return { success: false, message: 'Email already registered' };
  const user = { ...userData, id: 'user_' + Date.now() };
  db.users.push(user);
  saveDB(db);
  return { success: true, user };
}

export function loginUser(email, password) {
  const db = getDB();
  const user = db.users.find(u => u.email === email && u.password === password);
  if (!user) return { success: false, message: 'Invalid email or password' };
  return { success: true, user };
}

export function googleLoginUser(googleData, roleType = 'Student', extraFields = {}) {
  const db = getDB();
  let user = db.users.find(u => u.email === googleData.email);

  if (user) {
    // Update Google profile picture if available
    if (googleData.picture) user.picture = googleData.picture;
    saveDB(db);
    return { success: true, user, isNew: false };
  }

  // Auto-register new Google user
  const role = roleType === 'Student' ? 'Student' : (extraFields.role || 'HR');
  user = {
    id: 'user_' + Date.now(),
    email: googleData.email,
    name: googleData.name || googleData.email.split('@')[0],
    password: null, // Google-only user, no password
    role,
    company: extraFields.company || '',
    picture: googleData.picture || null,
    authProvider: 'google',
  };
  db.users.push(user);
  saveDB(db);
  return { success: true, user, isNew: true };
}

// ========== JOBS ==========
export function getJobs() {
  return getDB().jobs;
}

export function getJobById(id) {
  return getDB().jobs.find(j => j.id === id);
}

export function createJob(jobData) {
  const db = getDB();
  const job = { ...jobData, id: 'job_' + Date.now(), applicants: [], postedDate: new Date().toISOString().split('T')[0], status: 'Open' };
  db.jobs.push(job);
  // Auto-notify all students
  const students = db.users.filter(u => u.role === 'Student');
  students.forEach(s => {
    db.notifications.push({
      id: 'notif_' + Date.now() + '_' + s.id,
      userId: s.id,
      type: 'new_job',
      title: `New Job Posted: ${job.title}`,
      message: `${job.company} is hiring for ${job.title}. Required skills: ${job.skills.join(', ')}. Cutoff: ${job.cutoff}%`,
      jobId: job.id,
      read: false,
      date: new Date().toISOString().split('T')[0],
    });
  });
  saveDB(db);
  return job;
}

export function updateJobCutoff(jobId, cutoff) {
  const db = getDB();
  const job = db.jobs.find(j => j.id === jobId);
  if (job) { job.cutoff = cutoff; saveDB(db); }
  return job;
}

// ========== APPLICATIONS ==========
export function applyToJob(jobId, studentId, resumeData) {
  const db = getDB();
  const existing = db.applications.find(a => a.jobId === jobId && a.studentId === studentId);
  if (existing) return { success: false, message: 'Already applied' };
  const job = db.jobs.find(j => j.id === jobId);
  if (!job) return { success: false, message: 'Job not found' };
  const student = db.users.find(u => u.id === studentId);

  const score = calculateScore(resumeData.skills || [], job.skills);
  const codingProfile = db.profiles[studentId] || {};
  const app = {
    id: 'app_' + Date.now(), jobId, studentId, score,
    studentName: student ? student.name : resumeData.name || 'Unknown',
    studentEmail: student ? student.email : '',
    resumeData,
    codingProfile,
    appliedDate: new Date().toISOString().split('T')[0],
    status: score >= job.cutoff ? 'Shortlisted' : 'Below Cutoff',
    forwardedToRecruiters: score >= job.cutoff,
  };
  db.applications.push(app);
  job.applicants.push(app.id);

  // If eligible, notify HR/recruiters
  if (score >= job.cutoff) {
    const recruiters = db.users.filter(u => ['HR', 'Tech Lead', 'Manager'].includes(u.role));
    recruiters.forEach(r => {
      db.notifications.push({
        id: 'notif_' + Date.now() + '_' + r.id,
        userId: r.id,
        type: 'eligible_candidate',
        title: `Eligible Candidate: ${app.studentName}`,
        message: `${app.studentName} scored ${score}% for ${job.title} (cutoff: ${job.cutoff}%). Resume and profile forwarded automatically.`,
        jobId: job.id,
        applicationId: app.id,
        read: false,
        date: new Date().toISOString().split('T')[0],
      });
    });
    // Notify student
    db.notifications.push({
      id: 'notif_' + Date.now() + '_' + studentId + '_applied',
      userId: studentId,
      type: 'application_forwarded',
      title: `Your Application was Forwarded!`,
      message: `Your resume for ${job.title} at ${job.company} (score: ${score}%) has been automatically forwarded to the recruiting team.`,
      jobId: job.id,
      read: false,
      date: new Date().toISOString().split('T')[0],
    });
  }

  saveDB(db);
  return { success: true, application: app };
}

export function getApplicationsByJob(jobId) {
  const db = getDB();
  return db.applications.filter(a => a.jobId === jobId).sort((a, b) => b.score - a.score);
}

export function getApplicationsByStudent(studentId) {
  const db = getDB();
  return db.applications.filter(a => a.studentId === studentId);
}

export function getRecommendedJobs(studentSkills) {
  const db = getDB();
  const jobs = db.jobs.filter(j => j.status === 'Open');
  return jobs.map(job => {
    const score = calculateScore(studentSkills, job.skills);
    return { ...job, matchScore: score, meetsRequirement: score >= job.cutoff };
  }).sort((a, b) => b.matchScore - a.matchScore);
}

function calculateScore(candidateSkills, jobSkills) {
  if (!jobSkills.length) return 0;
  const candidateLower = candidateSkills.map(s => s.toLowerCase().trim());
  let matched = 0;
  jobSkills.forEach(skill => {
    if (candidateLower.includes(skill.toLowerCase().trim())) matched++;
  });
  return Math.round((matched / jobSkills.length) * 100);
}

// ========== RESUME PARSING ==========
export function parseResumeText(text, targetDomain = 'Tech') {
  const commonSkills = [
    // Tech
    'JavaScript', 'Python', 'Java', 'C++', 'C#', 'C', 'React', 'Angular', 'Vue', 'Node.js',
    'HTML', 'CSS', 'TypeScript', 'SQL', 'NoSQL', 'MongoDB', 'PostgreSQL', 'MySQL',
    'Docker', 'Kubernetes', 'AWS', 'Azure', 'GCP', 'Git', 'REST API', 'GraphQL',
    'Machine Learning', 'Deep Learning', 'TensorFlow', 'PyTorch', 'Pandas', 'NumPy',
    'Statistics', 'Data Analysis', 'NLP', 'Computer Vision', 'Linux', 'DevOps',
    'Agile', 'Scrum', 'CI/CD', 'Redux', 'Next.js', 'Flask', 'Django', 'Spring Boot',
    'Figma', 'UI/UX', 'Tailwind', 'Bootstrap', 'Express', 'Firebase', 'Supabase',
    'Rust', 'Go', 'Swift', 'Kotlin', 'Flutter', 'React Native', 'Electron',
    // Finance / Non-Tech
    'Accounting', 'Finance', 'Auditing', 'Taxation', 'Chartered Accountant', 'Financial Modeling',
    'Excel', 'Tally', 'GAAP', 'QuickBooks', 'SAP', 'Marketing', 'Sales', 'Business Strategy',
    'Project Management', 'Human Resources', 'Recruiting', 'Legal', 'Compliance', 'Operations'
  ];
  const upper = text.toUpperCase();
  const found = commonSkills.filter(s => upper.includes(s.toUpperCase()));
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
  const name = lines[0] || 'Unknown';

  // Detect coding profile links only if domain is Tech
  let codingProfiles = {};
  if (targetDomain !== 'Finance / Non-Tech') {
    codingProfiles = {
      leetcode: extractUrl(text, 'leetcode.com'),
      codechef: extractUrl(text, 'codechef.com'),
      smartinterviews: extractUrl(text, 'smartinterviews'),
      github: extractUrl(text, 'github.com'),
      linkedin: extractUrl(text, 'linkedin.com'),
    };
  }

  return { name, skills: found, rawText: text, codingProfiles, domain: targetDomain };
}

function extractUrl(text, domain) {
  const regex = new RegExp(`(https?://[^\\s]*${domain}[^\\s]*)`, 'gi');
  const match = text.match(regex);
  return match ? match[0] : null;
}

// ========== BULK SCAN ==========
export function bulkScanResumes(jobId, resumes, targetDomain = 'Tech') {
  const db = getDB();
  const job = db.jobs.find(j => j.id === jobId);
  if (!job) return [];
  return resumes.map(r => {
    const parsed = parseResumeText(r.text, targetDomain);
    const score = calculateScore(parsed.skills, job.skills);
    const matchedSkills = parsed.skills.filter(s => job.skills.map(js => js.toLowerCase()).includes(s.toLowerCase()));
    const missingSkills = job.skills.filter(s => !parsed.skills.map(ps => ps.toLowerCase()).includes(s.toLowerCase()));
    return {
      fileName: r.fileName,
      name: parsed.name,
      skills: parsed.skills,
      matchedSkills,
      missingSkills,
      score,
      meetsRequirement: score >= job.cutoff,
      codingProfiles: parsed.codingProfiles,
    };
  }).sort((a, b) => b.score - a.score);
}

// ========== CODING PROFILES ==========
export function saveCodingProfile(userId, profiles) {
  const db = getDB();
  if (!db.profiles) db.profiles = {};
  db.profiles[userId] = profiles;
  saveDB(db);
}

export function getCodingProfile(userId) {
  const db = getDB();
  return (db.profiles && db.profiles[userId]) || {};
}

// ========== NOTIFICATIONS ==========
export function getNotifications(userId) {
  const db = getDB();
  if (!db.notifications) return [];
  return db.notifications.filter(n => n.userId === userId).sort((a, b) => new Date(b.date) - new Date(a.date));
}

export function markNotificationRead(notifId) {
  const db = getDB();
  const notif = db.notifications.find(n => n.id === notifId);
  if (notif) { notif.read = true; saveDB(db); }
}

export function getUnreadCount(userId) {
  const db = getDB();
  if (!db.notifications) return 0;
  return db.notifications.filter(n => n.userId === userId && !n.read).length;
}

// ========== COURSE RECOMMENDATIONS ==========
export function getSkillRecommendations(missingSkills) {
  const courseDB = {
    'React': {
      youtube: 'https://www.youtube.com/results?search_query=React+full+course+2026',
      coursera: 'https://www.coursera.org/search?query=React',
      description: 'Learn component-based UI development with React.js',
      roadmap: ['HTML/CSS Basics', 'JavaScript ES6+', 'React Fundamentals', 'State Management', 'React Hooks', 'Next.js'],
    },
    'JavaScript': {
      youtube: 'https://www.youtube.com/results?search_query=JavaScript+complete+course',
      coursera: 'https://www.coursera.org/search?query=JavaScript',
      description: 'Master modern JavaScript including ES6+, async/await, and DOM manipulation',
      roadmap: ['Variables & Types', 'Functions & Closures', 'DOM Manipulation', 'ES6+ Features', 'Async Programming', 'Node.js'],
    },
    'Python': {
      youtube: 'https://www.youtube.com/results?search_query=Python+full+course+beginners',
      coursera: 'https://www.coursera.org/search?query=Python+programming',
      description: 'Python programming from basics to advanced concepts',
      roadmap: ['Syntax & Basics', 'Data Structures', 'OOP in Python', 'File I/O', 'Libraries (NumPy, Pandas)', 'Web Frameworks'],
    },
    'TypeScript': {
      youtube: 'https://www.youtube.com/results?search_query=TypeScript+tutorial',
      coursera: 'https://www.coursera.org/search?query=TypeScript',
      description: 'Add type safety to JavaScript projects with TypeScript',
      roadmap: ['Basic Types', 'Interfaces', 'Generics', 'Type Guards', 'Decorators', 'Advanced Patterns'],
    },
    'Node.js': {
      youtube: 'https://www.youtube.com/results?search_query=Node.js+full+course',
      coursera: 'https://www.coursera.org/search?query=Node.js',
      description: 'Server-side development with Node.js and Express',
      roadmap: ['Node Basics', 'Express.js', 'Middleware', 'REST APIs', 'Authentication', 'Database Integration'],
    },
    'SQL': {
      youtube: 'https://www.youtube.com/results?search_query=SQL+tutorial+for+beginners',
      coursera: 'https://www.coursera.org/search?query=SQL',
      description: 'Database querying and management with SQL',
      roadmap: ['SELECT & Filtering', 'JOINs', 'Aggregations', 'Subqueries', 'Indexing', 'Stored Procedures'],
    },
    'Docker': {
      youtube: 'https://www.youtube.com/results?search_query=Docker+tutorial+beginners',
      coursera: 'https://www.coursera.org/search?query=Docker',
      description: 'Containerization and deployment with Docker',
      roadmap: ['Containers vs VMs', 'Dockerfile', 'Docker Compose', 'Volumes', 'Networking', 'Docker in CI/CD'],
    },
    'AWS': {
      youtube: 'https://www.youtube.com/results?search_query=AWS+cloud+practitioner+course',
      coursera: 'https://www.coursera.org/search?query=AWS+cloud',
      description: 'Cloud computing fundamentals with Amazon Web Services',
      roadmap: ['IAM & Security', 'EC2 & S3', 'Lambda', 'RDS & DynamoDB', 'CloudFront', 'DevOps on AWS'],
    },
    'Machine Learning': {
      youtube: 'https://www.youtube.com/results?search_query=Machine+Learning+full+course',
      coursera: 'https://www.coursera.org/search?query=Machine+Learning',
      description: 'Build predictive models and intelligent systems',
      roadmap: ['Linear Algebra', 'Statistics', 'Supervised Learning', 'Unsupervised Learning', 'Neural Networks', 'Model Deployment'],
    },
    'TensorFlow': {
      youtube: 'https://www.youtube.com/results?search_query=TensorFlow+tutorial',
      coursera: 'https://www.coursera.org/search?query=TensorFlow',
      description: 'Deep learning framework by Google',
      roadmap: ['Tensors & Ops', 'Sequential Models', 'CNNs', 'RNNs', 'Transfer Learning', 'TF Serving'],
    },
    'CSS': {
      youtube: 'https://www.youtube.com/results?search_query=CSS+full+course+2026',
      coursera: 'https://www.coursera.org/search?query=CSS',
      description: 'Master styling, layouts, animations with CSS',
      roadmap: ['Selectors', 'Box Model', 'Flexbox', 'Grid', 'Animations', 'Responsive Design'],
    },
    'HTML': {
      youtube: 'https://www.youtube.com/results?search_query=HTML+full+course',
      coursera: 'https://www.coursera.org/search?query=HTML',
      description: 'Web page structure and semantic HTML',
      roadmap: ['Elements', 'Forms', 'Semantic HTML', 'Accessibility', 'SEO Basics'],
    },
    'Git': {
      youtube: 'https://www.youtube.com/results?search_query=Git+and+GitHub+tutorial',
      coursera: 'https://www.coursera.org/search?query=Git',
      description: 'Version control with Git and GitHub collaboration',
      roadmap: ['Init & Commit', 'Branching', 'Merging', 'Pull Requests', 'Conflict Resolution', 'CI/CD Workflow'],
    },
    'REST API': {
      youtube: 'https://www.youtube.com/results?search_query=REST+API+design+tutorial',
      coursera: 'https://www.coursera.org/search?query=REST+API',
      description: 'Design and build RESTful web services',
      roadmap: ['HTTP Methods', 'Endpoints Design', 'Authentication', 'Pagination', 'Error Handling', 'API Documentation'],
    },
    'Kubernetes': {
      youtube: 'https://www.youtube.com/results?search_query=Kubernetes+tutorial+beginners',
      coursera: 'https://www.coursera.org/search?query=Kubernetes',
      description: 'Container orchestration at scale',
      roadmap: ['Pods', 'Services', 'Deployments', 'ConfigMaps', 'Helm Charts', 'Monitoring'],
    },
    'Statistics': {
      youtube: 'https://www.youtube.com/results?search_query=Statistics+for+data+science',
      coursera: 'https://www.coursera.org/search?query=Statistics',
      description: 'Statistical analysis for data-driven decisions',
      roadmap: ['Descriptive Stats', 'Probability', 'Distributions', 'Hypothesis Testing', 'Regression', 'Bayesian Methods'],
    },
    'Pandas': {
      youtube: 'https://www.youtube.com/results?search_query=Pandas+Python+tutorial',
      coursera: 'https://www.coursera.org/search?query=Pandas+Python',
      description: 'Data manipulation library for Python',
      roadmap: ['DataFrames', 'Selection', 'Group By', 'Merge/Join', 'Time Series', 'Data Cleaning'],
    },
  };

  return missingSkills.map(skill => {
    const course = courseDB[skill];
    if (course) return { skill, ...course };
    return {
      skill,
      youtube: `https://www.youtube.com/results?search_query=${encodeURIComponent(skill)}+tutorial`,
      coursera: `https://www.coursera.org/search?query=${encodeURIComponent(skill)}`,
      description: `Learn ${skill} through online resources`,
      roadmap: ['Fundamentals', 'Intermediate Concepts', 'Advanced Topics', 'Projects'],
    };
  });
}

// ========== INTERVIEWS (Google Meet scheduling) ==========
export function scheduleInterview(applicationId, scheduledBy, details) {
  const db = getDB();
  if (!db.interviews) db.interviews = [];
  const app = db.applications.find(a => a.id === applicationId);
  if (!app) return { success: false, message: 'Application not found' };

  const interview = {
    id: 'intv_' + Date.now(),
    applicationId,
    jobId: app.jobId,
    studentId: app.studentId,
    studentName: app.studentName,
    scheduledBy,
    date: details.date,
    time: details.time,
    type: details.type || 'Coding Round',
    meetLink: details.meetLink || `https://meet.google.com/nexhire-${Date.now().toString(36)}`,
    notes: details.notes || '',
    status: 'Scheduled',
    createdDate: new Date().toISOString().split('T')[0],
  };
  db.interviews.push(interview);

  // Notify student
  db.notifications.push({
    id: 'notif_intv_' + Date.now(),
    userId: app.studentId,
    type: 'interview_scheduled',
    title: `Interview Scheduled: ${details.type || 'Coding Round'}`,
    message: `Your ${details.type || 'Coding Round'} for ${getJobById(app.jobId)?.title || 'a position'} has been scheduled on ${details.date} at ${details.time}. Google Meet: ${interview.meetLink}`,
    jobId: app.jobId,
    read: false,
    date: new Date().toISOString().split('T')[0],
  });

  saveDB(db);
  return { success: true, interview };
}

export function getInterviewsByJob(jobId) {
  const db = getDB();
  if (!db.interviews) return [];
  return db.interviews.filter(i => i.jobId === jobId);
}

export function getInterviewsByStudent(studentId) {
  const db = getDB();
  if (!db.interviews) return [];
  return db.interviews.filter(i => i.studentId === studentId);
}

// ========== FAIR EVALUATION & XAI ==========
export function evaluateCandidate(applicationId, evaluatorRole, evaluatorName, interviewScore, feedback, action, reason) {
  const db = getDB();
  const app = db.applications.find(a => a.id === applicationId);
  if (!app) return { success: false, message: 'Application not found' };

  if (!app.evaluations) app.evaluations = [];
  app.evaluations.push({
    evaluatorRole,
    evaluatorName,
    interviewScore: Number(interviewScore),
    feedback,
    date: new Date().toISOString().split('T')[0]
  });

  // Calculate new overall score
  const totalInt = app.evaluations.reduce((sum, e) => sum + e.interviewScore, 0);
  const avgInt = Math.round(totalInt / app.evaluations.length);
  app.overallScore = Math.round((app.score + avgInt) / 2);
  app.averageInterviewScore = avgInt;

  // Decide XAI Status Flags
  app.xaiFlag = null;
  if (app.score < 60 && avgInt >= 80) app.xaiFlag = 'High Potential 🌟';
  if (app.score >= 80 && avgInt < 50) app.xaiFlag = 'Flagged 🚩';

  // Apply Action if final
  if (action === 'Hire') app.status = 'Hired 🏆';
  if (action === 'Reject') app.status = 'Rejected ❌';

  // Generate XAI Summary
  app.xaiSummary = [
    `Resume Score: ${app.score}% | Average Interview Score: ${avgInt}%`,
    `Skills Matched: ${app.resumeData?.skills?.length || 0}`,
  ];
  if (app.xaiFlag === 'High Potential 🌟') app.xaiSummary.push('🟢 Remarkable interview performance overcame weak resume keywords.');
  if (app.xaiFlag === 'Flagged 🚩') app.xaiSummary.push('🔴 High resume keyword match, but significantly poor hands-on interview performance.');
  if (app.codingProfile && Object.values(app.codingProfile).filter(Boolean).length > 2) app.xaiSummary.push('🟢 Strong dynamic coding profile presence detected.');
  if (reason) app.xaiSummary.push(`📝 Decision Reason: ${reason}`);

  saveDB(db);
  return { success: true, application: app };
}

// ========== AI AUTO JD GENERATOR ==========
export function generateJobDescription(title, skillsArr, experience) {
  const skillsStr = skillsArr.length > 0 ? skillsArr.join(', ') : 'modern tech stacks';
  return `🚀 About the Role:
We are looking for a passionate ${title} to join our fast-paced, innovative team. You will be responsible for designing and developing scalable, high-performance systems.

📋 What You'll Do:
- Architect, build, and maintain efficient, reusable, and reliable code.
- Collaborate closely with product managers, designers, and fellow engineers to deliver high-quality features.
- Participate in code reviews, write automated tests, and ensure code quality.

🎯 Requirements:
- At least ${experience || 'relevant'} experience working as a ${title} or similar role.
- Strong proficiency in ${skillsStr}.
- A solid understanding of system architecture, data structures, and algorithms.
- Excellent problem-solving skills and a strong sense of ownership.

✨ What We Offer:
- Competitive compensation and equity packages.
- Comprehensive health benefits.
- Flexible, remote-first culture.`;
}

export function resetDB() {
  localStorage.removeItem(DB_KEY);
  getDB();
}
