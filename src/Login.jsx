import React, { useState, useEffect, useCallback, useRef } from 'react';
import { loginUser, registerUser, googleLoginUser } from './store';

// Your Google OAuth Client ID — replace with your own from Google Cloud Console
// Go to: https://console.cloud.google.com → APIs & Services → Credentials → Create OAuth 2.0 Client ID
const GOOGLE_CLIENT_ID = '970374453358-nsvjfq39gd63hdjurur9o25v1sgscv0l.apps.googleusercontent.com';

function decodeJWT(token) {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64).split('').map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)).join('')
    );
    return JSON.parse(jsonPayload);
  } catch {
    return null;
  }
}

export default function Login({ onLogin }) {
  const [isRegister, setIsRegister] = useState(false);
  const [roleType, setRoleType] = useState('Student');
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'Student', company: '' });
  const [error, setError] = useState('');
  const [googleLoading, setGoogleLoading] = useState(false);
  const [showGoogleRoleModal, setShowGoogleRoleModal] = useState(false);
  const [pendingGoogleData, setPendingGoogleData] = useState(null);
  const [googleRole, setGoogleRole] = useState('Student');
  const [googleCompany, setGoogleCompany] = useState('');
  const [googleHrRole, setGoogleHrRole] = useState('HR');
  const googleBtnRef = useRef(null);

  const hrRoles = ['HR', 'Tech Lead', 'Manager'];

  // Handle Google credential response
  const handleGoogleResponse = useCallback((response) => {
    setGoogleLoading(true);
    setError('');

    const decoded = decodeJWT(response.credential);
    if (!decoded) {
      setError('Failed to process Google sign-in. Please try again.');
      setGoogleLoading(false);
      return;
    }

    const googleData = {
      email: decoded.email,
      name: decoded.name,
      picture: decoded.picture,
    };

    // Check if user already exists in DB
    const existingResult = googleLoginUser(googleData, roleType);
    if (!existingResult.isNew) {
      // Existing user — log in directly
      onLogin(existingResult.user);
      setGoogleLoading(false);
      return;
    }

    // New user — if they chose Student, register as student immediately
    if (roleType === 'Student') {
      const res = googleLoginUser(googleData, 'Student');
      onLogin(res.user);
      setGoogleLoading(false);
    } else {
      // HR tab: ask for role/company details before completing
      setPendingGoogleData(googleData);
      setShowGoogleRoleModal(true);
      setGoogleLoading(false);
    }
  }, [roleType, onLogin]);

  // Initialize Google Sign-In
  useEffect(() => {
    const initGoogle = () => {
      if (window.google?.accounts?.id) {
        window.google.accounts.id.initialize({
          client_id: GOOGLE_CLIENT_ID,
          callback: handleGoogleResponse,
          auto_select: false,
          cancel_on_tap_outside: true,
        });

        // Render the hidden prompt button
        if (googleBtnRef.current) {
          window.google.accounts.id.renderButton(
            googleBtnRef.current,
            { type: 'standard', shape: 'rectangular', theme: 'outline', size: 'large', width: '100%' }
          );
        }
      }
    };

    // Google GIS script may load async, so retry
    if (window.google?.accounts?.id) {
      initGoogle();
    } else {
      const interval = setInterval(() => {
        if (window.google?.accounts?.id) {
          initGoogle();
          clearInterval(interval);
        }
      }, 200);
      return () => clearInterval(interval);
    }
  }, [handleGoogleResponse]);

  const triggerGoogleSignIn = () => {
    setError('');
    if (window.google?.accounts?.id) {
      window.google.accounts.id.prompt((notification) => {
        if (notification.isNotDisplayed() || notification.isSkippedMoment()) {
          // Fallback: click the rendered button
          const btn = googleBtnRef.current?.querySelector('div[role="button"]');
          if (btn) btn.click();
        }
      });
    } else {
      setError('Google Sign-In is loading. Please try again in a moment.');
    }
  };

  const completeGoogleHrRegistration = () => {
    if (!googleCompany.trim()) {
      setError('Please enter your company name');
      return;
    }
    const res = googleLoginUser(pendingGoogleData, 'HR', { role: googleHrRole, company: googleCompany });
    onLogin(res.user);
    setShowGoogleRoleModal(false);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');

    if (isRegister) {
      if (!form.name || !form.email || !form.password) {
        setError('Please fill all fields');
        return;
      }
      const role = roleType === 'Student' ? 'Student' : form.role;
      const res = registerUser({ ...form, role });
      if (res.success) {
        onLogin(res.user);
      } else {
        setError(res.message);
      }
    } else {
      if (!form.email || !form.password) {
        setError('Please enter email and password');
        return;
      }
      const res = loginUser(form.email, form.password);
      if (res.success) {
        onLogin(res.user);
      } else {
        setError(res.message);
      }
    }
  };

  const updateForm = (key, val) => setForm(prev => ({ ...prev, [key]: val }));

  return (
    <div className="login-wrapper">
      {/* Left branding panel */}
      <div className="login-left">
        <img src="/logo.jpg" alt="NexHire AI" style={{ height: '50px', marginBottom: '1rem', objectFit: 'contain' }} />
        <p>
          The intelligent ATS platform that evaluates candidates beyond the resume.
          AI-powered interviews, skill-first scoring, and explainable hiring decisions.
        </p>
        <div className="feature-pills">
          <span>🎯 Smart ATS Scoring</span>
          <span>🤖 AI Interviews</span>
          <span>📊 Skill-First Eval</span>
          <span>🔍 Explainable AI</span>
          <span>👥 Multi-Stakeholder</span>
          <span>📈 Job Matching</span>
        </div>
      </div>

      {/* Right login form */}
      <div className="login-right">
        <div className="login-box">
          <h2>{isRegister ? 'Create Account' : 'Welcome Back'}</h2>
          <p className="subtitle">{isRegister ? 'Join NexHire AI today' : 'Sign in to continue'}</p>

          {/* Role type toggle */}
          <div className="role-toggle">
            <button
              className={roleType === 'Student' ? 'active' : ''}
              onClick={() => { setRoleType('Student'); updateForm('role', 'Student'); }}
            >
              🎓 Student / User
            </button>
            <button
              className={roleType === 'HR' ? 'active' : ''}
              onClick={() => { setRoleType('HR'); updateForm('role', 'HR'); }}
            >
              🏢 HR / Team
            </button>
          </div>

          {/* ─── Google Sign-In Button ─── */}
          <button
            type="button"
            id="google-signin-btn"
            className="google-btn"
            onClick={triggerGoogleSignIn}
            disabled={googleLoading}
          >
            {googleLoading ? (
              <span className="google-btn-loading">
                <span className="spinner" />
                Signing in...
              </span>
            ) : (
              <>
                <svg className="google-icon" viewBox="0 0 24 24" width="20" height="20">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                </svg>
                Continue with Google
              </>
            )}
          </button>

          {/* Hidden Google rendered button (for fallback) */}
          <div ref={googleBtnRef} style={{ position: 'absolute', opacity: 0, pointerEvents: 'none', width: 0, height: 0, overflow: 'hidden' }} />

          {/* Divider */}
          <div className="login-divider">
            <span>or</span>
          </div>

          {/* Email/Password Form */}
          <form onSubmit={handleSubmit}>
            {isRegister && (
              <div className="form-group">
                <label>Full Name</label>
                <input
                  type="text" placeholder="Enter your name"
                  value={form.name} onChange={e => updateForm('name', e.target.value)}
                />
              </div>
            )}

            <div className="form-group">
              <label>Email</label>
              <input
                type="email" placeholder="you@example.com"
                value={form.email} onChange={e => updateForm('email', e.target.value)}
              />
            </div>

            <div className="form-group">
              <label>Password</label>
              <input
                type="password" placeholder="••••••••"
                value={form.password} onChange={e => updateForm('password', e.target.value)}
              />
            </div>

            {isRegister && roleType === 'HR' && (
              <>
                <div className="form-group">
                  <label>Your Role</label>
                  <select value={form.role} onChange={e => updateForm('role', e.target.value)}>
                    {hrRoles.map(r => <option key={r} value={r}>{r}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label>Company Name</label>
                  <input
                    type="text" placeholder="e.g., TechCorp"
                    value={form.company} onChange={e => updateForm('company', e.target.value)}
                  />
                </div>
              </>
            )}

            {error && (
              <div style={{ background: 'var(--danger-bg)', color: 'var(--danger)', padding: '10px 14px', borderRadius: '8px', fontSize: '0.85rem', marginBottom: '1rem', fontWeight: 500 }}>
                {error}
              </div>
            )}

            <button type="submit" className="btn btn-primary btn-full" style={{ marginBottom: '1rem' }}>
              {isRegister ? 'Create Account' : 'Sign In'} →
            </button>
          </form>

          <p style={{ textAlign: 'center', fontSize: '0.9rem', color: 'var(--text-light)' }}>
            {isRegister ? 'Already have an account?' : "Don't have an account?"}{' '}
            <span
              onClick={() => { setIsRegister(!isRegister); setError(''); }}
              style={{ color: 'var(--primary)', cursor: 'pointer', fontWeight: 600 }}
            >
              {isRegister ? 'Sign In' : 'Register'}
            </span>
          </p>

          {!isRegister && roleType === 'HR' && (
            <div style={{ marginTop: '1.5rem', background: 'var(--bg-input)', padding: '1rem', borderRadius: '8px', border: '1px solid var(--border)' }}>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-light)', marginBottom: '8px', fontWeight: 600 }}>Demo Credentials</p>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-mid)', lineHeight: '1.8' }}>
                <div><b>HR:</b> hr@nexhire.com / hr123</div>
                <div><b>Tech Lead:</b> techlead@nexhire.com / tl123</div>
                <div><b>Manager:</b> manager@nexhire.com / mgr123</div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ─── Google HR Role Selection Modal ─── */}
      {showGoogleRoleModal && (
        <div className="modal-overlay" onClick={() => setShowGoogleRoleModal(false)}>
          <div className="modal-box google-role-modal" onClick={e => e.stopPropagation()}>
            <div className="google-modal-header">
              {pendingGoogleData?.picture && (
                <img src={pendingGoogleData.picture} alt="" className="google-modal-avatar" />
              )}
              <div>
                <h3 style={{ fontSize: '1.2rem', marginBottom: '4px' }}>Complete Your Profile</h3>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-light)' }}>
                  Welcome, <strong>{pendingGoogleData?.name}</strong>! Set up your HR account.
                </p>
              </div>
            </div>

            <div className="form-group" style={{ marginTop: '1.5rem' }}>
              <label>Your Role</label>
              <select value={googleHrRole} onChange={e => setGoogleHrRole(e.target.value)}>
                {hrRoles.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>

            <div className="form-group">
              <label>Company Name</label>
              <input
                type="text"
                placeholder="e.g., TechCorp"
                value={googleCompany}
                onChange={e => setGoogleCompany(e.target.value)}
              />
            </div>

            {error && (
              <div style={{ background: 'var(--danger-bg)', color: 'var(--danger)', padding: '10px 14px', borderRadius: '8px', fontSize: '0.85rem', marginBottom: '1rem', fontWeight: 500 }}>
                {error}
              </div>
            )}

            <div style={{ display: 'flex', gap: '12px', marginTop: '0.5rem' }}>
              <button className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setShowGoogleRoleModal(false)}>
                Cancel
              </button>
              <button className="btn btn-primary" style={{ flex: 1 }} onClick={completeGoogleHrRegistration}>
                Complete Setup →
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
