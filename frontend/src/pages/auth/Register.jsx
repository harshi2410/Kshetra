import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertCircle, Eye, EyeOff, Map, TrendingUp, Shield, X, ExternalLink, Key, Sparkles, Check } from 'lucide-react';
import useAuth from '../../auth/useAuth';
import { getGoogleClientId, setGoogleClientId, triggerGoogleBrowserAuth } from '../../auth/googleAuth';

export default function Register() {
  const navigate = useNavigate();
  const { register, loginWithGoogle, isAuthenticated } = useAuth();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [company, setCompany] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [agreeTerms, setAgreeTerms] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [errors, setErrors] = useState({});
  const [authError, setAuthError] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [modalClientId, setModalClientId] = useState('');
  const [modalSaved, setModalSaved] = useState(false);

  useEffect(() => {
    if (isAuthenticated) {
      navigate('/dashboard', { replace: true });
    }
  }, [isAuthenticated, navigate]);

  // Evaluate password strength
  const getPasswordStrength = (pwd) => {
    if (!pwd) return { score: 0, label: '', color: 'transparent' };
    let score = 0;
    if (pwd.length >= 6) score++;
    if (pwd.length >= 10) score++;
    if (/[A-Z]/.test(pwd)) score++;
    if (/[0-9]/.test(pwd)) score++;
    if (/[^A-Za-z0-9]/.test(pwd)) score++;

    if (score <= 1) return { score: 1, label: 'Weak', color: '#EF4444' };
    if (score <= 3) return { score: 2, label: 'Fair', color: '#F59E0B' };
    if (score === 4) return { score: 3, label: 'Good', color: '#3B82F6' };
    return { score: 4, label: 'Strong', color: '#10B981' };
  };

  const strength = getPasswordStrength(password);

  const validate = () => {
    const e = {};
    if (!name.trim()) e.name = 'Full name is required';
    if (!email.trim()) e.email = 'Email is required';
    else if (!/\S+@\S+\.\S+/.test(email)) e.email = 'Enter a valid email address';

    if (!password) e.password = 'Password is required';
    else if (password.length < 6) e.password = 'Password must be at least 6 characters';

    if (!confirmPassword) e.confirmPassword = 'Confirm your password';
    else if (password !== confirmPassword) e.confirmPassword = 'Passwords do not match';

    if (!agreeTerms) e.agreeTerms = 'You must accept the terms of service';

    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (ev) => {
    ev.preventDefault();
    setAuthError('');
    if (!validate()) return;
    setLoading(true);

    try {
      await register({
        name,
        email,
        password,
        company,
        rememberMe: true
      });
      navigate('/dashboard', { replace: true });
    } catch (err) {
      setAuthError(err.message || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignUp = async (overrideClientId = null) => {
    setAuthError('');
    const clientId = overrideClientId || getGoogleClientId();

    if (!clientId) {
      setShowConfigModal(true);
      return;
    }

    setGoogleLoading(true);
    try {
      const account = await triggerGoogleBrowserAuth();
      await loginWithGoogle({
        access_token: account.access_token,
        email: account.email,
        name: account.name,
        avatar: account.avatar,
        rememberMe: true,
      });
      navigate('/dashboard', { replace: true });
    } catch (err) {
      if (err.message === 'NO_CLIENT_ID') {
        setShowConfigModal(true);
      } else {
        setAuthError(err.message || 'Google registration was cancelled or failed.');
      }
    } finally {
      setGoogleLoading(false);
    }
  };

  const handleDemoGoogleSignIn = async () => {
    setGoogleLoading(true);
    setShowConfigModal(false);
    try {
      await loginWithGoogle({
        email: 'alexander.wright@gmail.com',
        name: 'Alexander Wright',
        avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=256&q=80',
        rememberMe: true,
      });
      navigate('/dashboard', { replace: true });
    } catch (err) {
      setAuthError(err.message || 'Demo Google sign-in failed.');
    } finally {
      setGoogleLoading(false);
    }
  };

  const handleSaveAndConnect = async (e) => {
    e.preventDefault();
    if (!modalClientId.trim()) return;
    setGoogleClientId(modalClientId.trim());
    setModalSaved(true);
    setTimeout(() => {
      setShowConfigModal(false);
      handleGoogleSignUp(modalClientId.trim());
    }, 400);
  };

  const inputStyle = (hasError) => ({
    width: '100%',
    height: '46px',
    padding: '0 16px',
    border: `1px solid ${hasError ? 'var(--df-danger)' : 'var(--df-border-input)'}`,
    borderRadius: '8px',
    fontSize: '14px',
    backgroundColor: 'var(--df-input-bg)',
    color: 'var(--df-text)',
    outline: 'none',
    boxSizing: 'border-box',
    transition: 'border-color 0.15s, box-shadow 0.15s',
    fontFamily: 'var(--font-sans)',
  });

  const features = [
    { icon: Map, text: 'Autonomous CAD & GIS plot subdivision layouts' },
    { icon: Shield, text: 'Municipal regulatory & legal compliance checks' },
    { icon: TrendingUp, text: 'Real-time sales CRM, broker payouts & collections' },
  ];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 min-h-screen" style={{
      fontFamily: 'var(--font-sans)',
    }}>

      {/* ══════════════════════════════════════════
          LEFT — Brand Panel
      ══════════════════════════════════════════ */}
      <div className="hidden lg:flex" style={{
        background: 'linear-gradient(145deg, #7A1E3A 0%, #5E152C 60%, #4A0F22 100%)',
        flexDirection: 'column',
        justifyContent: 'center',
        padding: '3rem 3.5rem',
        position: 'relative',
        overflow: 'hidden',
      }}>
        {/* Decorative background blurs */}
        <div style={{
          position: 'absolute', top: '-80px', right: '-80px',
          width: '320px', height: '320px', borderRadius: '50%',
          backgroundColor: 'rgba(255,255,255,0.06)', pointerEvents: 'none',
        }} />
        <div style={{
          position: 'absolute', bottom: '-60px', left: '-60px',
          width: '240px', height: '240px', borderRadius: '50%',
          backgroundColor: 'rgba(255,255,255,0.04)', pointerEvents: 'none',
        }} />

        {/* Brand mark */}
        <div style={{ marginBottom: '3rem', position: 'relative', zIndex: 1 }}>
          <span style={{
            fontSize: '13px', fontWeight: 700, letterSpacing: '0.18em',
            textTransform: 'uppercase', color: 'rgba(255,255,255,0.5)',
          }}>
            ENTERPRISE PLATFORM
          </span>
          <h1 style={{
            fontSize: '3.25rem', fontWeight: 300, lineHeight: 1.15,
            letterSpacing: '-0.03em', color: '#FFFFFF',
            margin: '8px 0 0', fontFamily: 'var(--font-display)',
          }}>
            Land<span style={{ fontWeight: 700 }}>OS</span>
          </h1>
          <p style={{
            fontSize: '1.05rem', color: 'rgba(255,255,255,0.65)',
            lineHeight: 1.6, marginTop: '12px', maxWidth: '380px',
          }}>
            Join top land developers and asset managers building high-margin plotted communities with autonomous intelligence.
          </p>
        </div>

        {/* Feature list */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', position: 'relative', zIndex: 1 }}>
          {features.map(({ icon: Icon, text }, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{
                width: '32px', height: '32px', borderRadius: '8px',
                backgroundColor: 'rgba(255,255,255,0.12)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
              }}>
                <Icon style={{ width: '15px', height: '15px', color: 'rgba(255,255,255,0.85)' }} />
              </div>
              <span style={{ fontSize: '13.5px', color: 'rgba(255,255,255,0.75)', lineHeight: 1.4 }}>
                {text}
              </span>
            </div>
          ))}
        </div>

        {/* Bottom meta */}
        <div style={{
          position: 'absolute', bottom: '2rem', left: '3.5rem', right: '3.5rem',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.35)' }}>
            © 2025 LandOS. All rights reserved.
          </span>
          <span style={{
            fontSize: '10px', fontWeight: 700, letterSpacing: '0.12em',
            textTransform: 'uppercase', color: 'rgba(255,255,255,0.3)',
          }}>
            v2.0
          </span>
        </div>
      </div>

      {/* ══════════════════════════════════════════
          RIGHT — Form Panel
      ══════════════════════════════════════════ */}
      <div style={{
        backgroundColor: 'var(--df-bg)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '2.5rem 1.5rem',
        overflowY: 'auto',
      }}>
        <div style={{ width: '100%', maxWidth: '420px' }}>

          {/* Form header */}
          <div style={{ marginBottom: '1.75rem' }}>
            <h2 style={{
              fontSize: '1.85rem', fontWeight: 400, color: 'var(--df-text)',
              letterSpacing: '-0.02em', lineHeight: 1.2,
              fontFamily: 'var(--font-display)', margin: '0 0 6px',
            }}>
              Create your account
            </h2>
            <p style={{ fontSize: '13.5px', color: 'var(--df-text-muted)', margin: 0 }}>
              Get started with enterprise land development tools
            </p>
          </div>

          {/* Google SSO Button */}
          <button
            id="register-google"
            type="button"
            disabled={loading || googleLoading}
            onClick={handleGoogleSignUp}
            style={{
              width: '100%',
              height: '46px',
              backgroundColor: '#FFFFFF',
              color: '#374151',
              border: '1px solid #E5E7EB',
              borderRadius: '8px',
              fontSize: '14px',
              fontWeight: 500,
              cursor: loading || googleLoading ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '10px',
              boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
              transition: 'all 0.15s ease',
              fontFamily: 'var(--font-sans)',
              marginBottom: '16px',
            }}
            onMouseEnter={e => { if (!googleLoading && !loading) { e.currentTarget.style.backgroundColor = '#F9FAFB'; e.currentTarget.style.borderColor = '#D1D5DB'; } }}
            onMouseLeave={e => { if (!googleLoading && !loading) { e.currentTarget.style.backgroundColor = '#FFFFFF'; e.currentTarget.style.borderColor = '#E5E7EB'; } }}
          >
            {googleLoading ? (
              <span style={{
                width: '16px', height: '16px', border: '2px solid rgba(122,30,58,0.2)',
                borderTopColor: 'var(--df-accent)', borderRadius: '50%',
                animation: 'landos-spin 0.7s linear infinite',
                display: 'inline-block',
              }} />
            ) : (
              <svg width="18" height="18" viewBox="0 0 24 24" style={{ display: 'block' }}>
                <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.17z" />
                <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.24v3.15C3.26 21.36 7.34 24 12 24z" />
                <path fill="#FBBC05" d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.24C.45 8.15 0 9.99 0 12s.45 3.85 1.24 5.42l4.04-3.15z" />
                <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.34 0 3.26 2.64 1.24 6.58l4.04 3.15c.95-2.83 3.6-4.98 6.72-4.98z" />
              </svg>
            )}
            <span>{googleLoading ? 'Setting up Google account…' : 'Continue with Google'}</span>
          </button>

          {/* Divider */}
          <div style={{ display: 'flex', alignItems: 'center', margin: '0 0 18px', gap: '12px' }}>
            <div style={{ flex: 1, height: '1px', backgroundColor: 'var(--df-border)' }} />
            <span style={{ fontSize: '12px', color: 'var(--df-text-muted)', textTransform: 'lowercase' }}>or register with email</span>
            <div style={{ flex: 1, height: '1px', backgroundColor: 'var(--df-border)' }} />
          </div>

          {/* Error Banner */}
          {authError && (
            <div style={{
              padding: '10px 12px', borderRadius: '6px', marginBottom: '16px',
              backgroundColor: 'rgba(185,28,28,0.06)',
              border: '1px solid rgba(185,28,28,0.2)',
              fontSize: '12.5px', color: 'var(--df-danger)',
              display: 'flex', alignItems: 'flex-start', gap: '8px',
            }}>
              <AlertCircle style={{ width: '14px', height: '14px', flexShrink: 0, marginTop: '2px' }} />
              <div style={{ flex: 1 }}>
                <span>{authError}</span>
                {authError.includes('VITE_GOOGLE_CLIENT_ID') && (
                  <button
                    type="button"
                    onClick={() => setShowConfigModal(true)}
                    style={{
                      display: 'block', marginTop: '6px', fontSize: '12px',
                      fontWeight: 600, color: 'var(--df-accent)', background: 'transparent',
                      border: 'none', padding: 0, cursor: 'pointer', textDecoration: 'underline'
                    }}
                  >
                    Configure Google OAuth Client ID or test via Dev Mode →
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Registration Form */}
          <form onSubmit={handleSubmit} noValidate style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

            {/* Name */}
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: 'var(--df-text-soft)', marginBottom: '5px' }}>
                Full Name
              </label>
              <input
                id="register-name"
                type="text"
                value={name}
                onChange={e => { setName(e.target.value); setErrors(p => ({ ...p, name: '' })); }}
                placeholder="Alexander Wright"
                autoComplete="name"
                style={inputStyle(errors.name)}
                onFocus={e => { e.target.style.borderColor = 'var(--df-accent)'; e.target.style.boxShadow = '0 0 0 3px var(--df-accent-soft)'; }}
                onBlur={e => { e.target.style.borderColor = errors.name ? 'var(--df-danger)' : 'var(--df-border-input)'; e.target.style.boxShadow = 'none'; }}
              />
              {errors.name && (
                <p style={{ fontSize: '11.5px', color: 'var(--df-danger)', marginTop: '4px' }}>{errors.name}</p>
              )}
            </div>

            {/* Email */}
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: 'var(--df-text-soft)', marginBottom: '5px' }}>
                Work Email
              </label>
              <input
                id="register-email"
                type="email"
                value={email}
                onChange={e => { setEmail(e.target.value); setErrors(p => ({ ...p, email: '' })); }}
                placeholder="alexander@company.com"
                autoComplete="email"
                style={inputStyle(errors.email)}
                onFocus={e => { e.target.style.borderColor = 'var(--df-accent)'; e.target.style.boxShadow = '0 0 0 3px var(--df-accent-soft)'; }}
                onBlur={e => { e.target.style.borderColor = errors.email ? 'var(--df-danger)' : 'var(--df-border-input)'; e.target.style.boxShadow = 'none'; }}
              />
              {errors.email && (
                <p style={{ fontSize: '11.5px', color: 'var(--df-danger)', marginTop: '4px' }}>{errors.email}</p>
              )}
            </div>

            {/* Company (Optional) */}
            <div>
              <label style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', fontWeight: 500, color: 'var(--df-text-soft)', marginBottom: '5px' }}>
                <span>Company / Developer Name</span>
                <span style={{ color: 'var(--df-text-muted)', fontSize: '11.5px', fontWeight: 400 }}>Optional</span>
              </label>
              <input
                id="register-company"
                type="text"
                value={company}
                onChange={e => setCompany(e.target.value)}
                placeholder="Apex Realty Developers"
                style={inputStyle(false)}
                onFocus={e => { e.target.style.borderColor = 'var(--df-accent)'; e.target.style.boxShadow = '0 0 0 3px var(--df-accent-soft)'; }}
                onBlur={e => { e.target.style.borderColor = 'var(--df-border-input)'; e.target.style.boxShadow = 'none'; }}
              />
            </div>

            {/* Password */}
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: 'var(--df-text-soft)', marginBottom: '5px' }}>
                Password
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  id="register-password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={e => { setPassword(e.target.value); setErrors(p => ({ ...p, password: '' })); }}
                  placeholder="Min. 6 characters"
                  autoComplete="new-password"
                  style={{ ...inputStyle(errors.password), paddingRight: '44px' }}
                  onFocus={e => { e.target.style.borderColor = 'var(--df-accent)'; e.target.style.boxShadow = '0 0 0 3px var(--df-accent-soft)'; }}
                  onBlur={e => { e.target.style.borderColor = errors.password ? 'var(--df-danger)' : 'var(--df-border-input)'; e.target.style.boxShadow = 'none'; }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(v => !v)}
                  style={{
                    position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)',
                    background: 'transparent', border: 'none', cursor: 'pointer',
                    color: 'var(--df-text-muted)', display: 'flex', padding: '4px',
                  }}
                >
                  {showPassword
                    ? <EyeOff style={{ width: '15px', height: '15px' }} />
                    : <Eye style={{ width: '15px', height: '15px' }} />}
                </button>
              </div>

              {/* Password strength meter */}
              {password && (
                <div style={{ marginTop: '8px' }}>
                  <div style={{ display: 'flex', gap: '4px', height: '4px', marginBottom: '4px' }}>
                    {[1, 2, 3, 4].map((step) => (
                      <div
                        key={step}
                        style={{
                          flex: 1,
                          borderRadius: '2px',
                          backgroundColor: step <= strength.score ? strength.color : 'var(--df-border)',
                          transition: 'background-color 0.2s',
                        }}
                      />
                    ))}
                  </div>
                  <span style={{ fontSize: '11px', color: strength.color, fontWeight: 500 }}>
                    {strength.label} password
                  </span>
                </div>
              )}

              {errors.password && (
                <p style={{ fontSize: '11.5px', color: 'var(--df-danger)', marginTop: '4px' }}>{errors.password}</p>
              )}
            </div>

            {/* Confirm Password */}
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: 'var(--df-text-soft)', marginBottom: '5px' }}>
                Confirm Password
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  id="register-confirm-password"
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={e => { setConfirmPassword(e.target.value); setErrors(p => ({ ...p, confirmPassword: '' })); }}
                  placeholder="Repeat your password"
                  autoComplete="new-password"
                  style={{ ...inputStyle(errors.confirmPassword), paddingRight: '44px' }}
                  onFocus={e => { e.target.style.borderColor = 'var(--df-accent)'; e.target.style.boxShadow = '0 0 0 3px var(--df-accent-soft)'; }}
                  onBlur={e => { e.target.style.borderColor = errors.confirmPassword ? 'var(--df-danger)' : 'var(--df-border-input)'; e.target.style.boxShadow = 'none'; }}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(v => !v)}
                  style={{
                    position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)',
                    background: 'transparent', border: 'none', cursor: 'pointer',
                    color: 'var(--df-text-muted)', display: 'flex', padding: '4px',
                  }}
                >
                  {showConfirmPassword
                    ? <EyeOff style={{ width: '15px', height: '15px' }} />
                    : <Eye style={{ width: '15px', height: '15px' }} />}
                </button>
              </div>
              {errors.confirmPassword && (
                <p style={{ fontSize: '11.5px', color: 'var(--df-danger)', marginTop: '4px' }}>{errors.confirmPassword}</p>
              )}
            </div>

            {/* Terms checkbox */}
            <div>
              <label style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', cursor: 'pointer' }}>
                <input
                  id="register-terms"
                  type="checkbox"
                  checked={agreeTerms}
                  onChange={e => { setAgreeTerms(e.target.checked); setErrors(p => ({ ...p, agreeTerms: '' })); }}
                  style={{ width: '15px', height: '15px', accentColor: 'var(--df-accent)', marginTop: '2px', cursor: 'pointer' }}
                />
                <span style={{ fontSize: '12.5px', color: 'var(--df-text-muted)', lineHeight: 1.4 }}>
                  I agree to the <span style={{ color: 'var(--df-accent)', fontWeight: 500 }}>Terms of Service</span> and <span style={{ color: 'var(--df-accent)', fontWeight: 500 }}>Privacy Policy</span>.
                </span>
              </label>
              {errors.agreeTerms && (
                <p style={{ fontSize: '11.5px', color: 'var(--df-danger)', marginTop: '4px' }}>{errors.agreeTerms}</p>
              )}
            </div>

            {/* Submit */}
            <button
              id="register-submit"
              type="submit"
              disabled={loading || googleLoading}
              style={{
                width: '100%', height: '48px',
                backgroundColor: loading ? 'rgba(122,30,58,0.6)' : 'var(--df-accent)',
                color: '#FFFFFF',
                border: 'none', borderRadius: '8px',
                fontSize: '14px', fontWeight: 600,
                cursor: loading || googleLoading ? 'not-allowed' : 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                transition: 'background-color 0.15s, box-shadow 0.15s',
                boxShadow: '0 4px 14px rgba(122,30,58,0.25)',
                fontFamily: 'var(--font-sans)',
                marginTop: '4px',
              }}
              onMouseEnter={e => { if (!loading && !googleLoading) e.currentTarget.style.backgroundColor = 'var(--df-accent-alt)'; }}
              onMouseLeave={e => { if (!loading && !googleLoading) e.currentTarget.style.backgroundColor = 'var(--df-accent)'; }}
            >
              {loading ? (
                <>
                  <span style={{
                    width: '16px', height: '16px', border: '2px solid rgba(255,255,255,0.3)',
                    borderTopColor: '#fff', borderRadius: '50%',
                    animation: 'landos-spin 0.7s linear infinite',
                    display: 'inline-block',
                  }} />
                  Creating account…
                </>
              ) : 'Create LandOS Account'}
            </button>

          </form>

          {/* Already have an account */}
          <div style={{ textAlign: 'center', marginTop: '1.25rem' }}>
            <span style={{ fontSize: '13.5px', color: 'var(--df-text-muted)' }}>
              Already have an account?{' '}
            </span>
            <button
              type="button"
              id="go-to-login"
              onClick={() => navigate('/login')}
              style={{
                fontSize: '13.5px',
                color: 'var(--df-accent)',
                background: 'transparent',
                border: 'none',
                fontWeight: 600,
                cursor: 'pointer',
                padding: 0,
              }}
              onMouseEnter={e => e.currentTarget.style.textDecoration = 'underline'}
              onMouseLeave={e => e.currentTarget.style.textDecoration = 'none'}
            >
              Sign in
            </button>
          </div>

          {/* Footer note */}
          <p style={{ fontSize: '11.5px', color: 'var(--df-text-muted)', textAlign: 'center', marginTop: '1.75rem' }}>
            Enterprise data protected by 256-bit encryption.
          </p>
        </div>
      </div>

      {/* ══════════════════════════════════════════
          MODAL — Google OAuth Setup & Dev Mode
      ══════════════════════════════════════════ */}
      {showConfigModal && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 9999,
          backgroundColor: 'rgba(0, 0, 0, 0.65)',
          backdropFilter: 'blur(6px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: '16px',
        }}>
          <div style={{
            backgroundColor: 'var(--df-card-bg, #1e2433)',
            color: 'var(--df-text, #ffffff)',
            borderRadius: '12px',
            border: '1px solid var(--df-border, rgba(255,255,255,0.15))',
            maxWidth: '520px',
            width: '100%',
            boxShadow: '0 20px 40px rgba(0,0,0,0.4)',
            overflow: 'hidden',
            fontFamily: 'var(--font-sans)',
          }}>
            {/* Modal Header */}
            <div style={{
              padding: '18px 22px',
              borderBottom: '1px solid var(--df-border, rgba(255,255,255,0.1))',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              background: 'rgba(255,255,255,0.02)',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{
                  width: '32px', height: '32px', borderRadius: '8px',
                  backgroundColor: '#ffffff', display: 'flex',
                  alignItems: 'center', justifyContent: 'center',
                }}>
                  <svg width="18" height="18" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.17z" />
                    <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.24v3.15C3.26 21.36 7.34 24 12 24z" />
                    <path fill="#FBBC05" d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.24C.45 8.15 0 9.99 0 12s.45 3.85 1.24 5.42l4.04-3.15z" />
                    <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.34 0 3.26 2.64 1.24 6.58l4.04 3.15c.95-2.83 3.6-4.98 6.72-4.98z" />
                  </svg>
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 600 }}>Google Sign-In Configuration</h3>
                  <p style={{ margin: 0, fontSize: '12px', color: 'var(--df-text-muted, #9ca3af)' }}>OAuth 2.0 Web Client Setup & Dev Mode</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowConfigModal(false)}
                style={{ background: 'transparent', border: 'none', color: 'var(--df-text-muted, #9ca3af)', cursor: 'pointer', padding: '4px' }}
              >
                <X style={{ width: '18px', height: '18px' }} />
              </button>
            </div>

            {/* Modal Body */}
            <div style={{ padding: '22px' }}>
              {/* Option 1: Dev Mode instant sign in */}
              <div style={{
                padding: '14px 16px',
                borderRadius: '8px',
                backgroundColor: 'rgba(122, 30, 58, 0.12)',
                border: '1px solid rgba(122, 30, 58, 0.3)',
                marginBottom: '20px',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--df-accent, #c93b67)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Sparkles style={{ width: '14px', height: '14px' }} /> Instant Development Mode
                  </span>
                  <span style={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.05em', backgroundColor: 'var(--df-accent, #c93b67)', color: '#fff', padding: '2px 6px', borderRadius: '4px', fontWeight: 700 }}>
                    Fast Test
                  </span>
                </div>
                <p style={{ fontSize: '12px', color: 'var(--df-text-soft, #d1d5db)', margin: '0 0 12px', lineHeight: 1.4 }}>
                  Test the entire post-login experience (dashboard, Google avatar, session persistence, role permissions) right now without setting up Google Cloud keys.
                </p>
                <button
                  type="button"
                  onClick={handleDemoGoogleSignIn}
                  style={{
                    width: '100%', height: '40px',
                    backgroundColor: 'var(--df-accent, #7A1E3A)',
                    color: '#ffffff',
                    border: 'none', borderRadius: '6px',
                    fontSize: '13px', fontWeight: 600,
                    cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                    boxShadow: '0 2px 8px rgba(122, 30, 58, 0.3)',
                  }}
                >
                  <Sparkles style={{ width: '14px', height: '14px' }} />
                  Sign In with Demo Google Account
                </button>
              </div>

              {/* Divider */}
              <div style={{ display: 'flex', alignItems: 'center', margin: '16px 0', gap: '10px' }}>
                <div style={{ flex: 1, height: '1px', backgroundColor: 'var(--df-border, rgba(255,255,255,0.1))' }} />
                <span style={{ fontSize: '11px', color: 'var(--df-text-muted, #9ca3af)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>OR CONNECT REAL GOOGLE CLIENT ID</span>
                <div style={{ flex: 1, height: '1px', backgroundColor: 'var(--df-border, rgba(255,255,255,0.1))' }} />
              </div>

              {/* Option 2: Enter Client ID */}
              <form onSubmit={handleSaveAndConnect} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 500, marginBottom: '6px', color: 'var(--df-text-soft, #d1d5db)' }}>
                    Paste your Google OAuth Client ID
                  </label>
                  <input
                    type="text"
                    value={modalClientId}
                    onChange={(e) => setModalClientId(e.target.value)}
                    placeholder="xxxxxxxxxxxx-xxxxxxxxxxxxxxxx.apps.googleusercontent.com"
                    style={{
                      width: '100%', height: '42px',
                      padding: '0 12px',
                      borderRadius: '6px',
                      border: '1px solid var(--df-border, rgba(255,255,255,0.2))',
                      backgroundColor: 'var(--df-input-bg, #111827)',
                      color: 'var(--df-text, #ffffff)',
                      fontSize: '12.5px',
                      outline: 'none',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>

                <button
                  type="submit"
                  disabled={!modalClientId.trim()}
                  style={{
                    width: '100%', height: '42px',
                    backgroundColor: modalSaved ? '#10B981' : '#ffffff',
                    color: modalSaved ? '#ffffff' : '#111827',
                    border: 'none', borderRadius: '6px',
                    fontSize: '13px', fontWeight: 600,
                    cursor: modalClientId.trim() ? 'pointer' : 'not-allowed',
                    opacity: modalClientId.trim() ? 1 : 0.6,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                    transition: 'all 0.2s ease',
                  }}
                >
                  {modalSaved ? (
                    <>
                      <Check style={{ width: '15px', height: '15px' }} />
                      Saved! Opening Google Sign-In…
                    </>
                  ) : (
                    <>
                      <Key style={{ width: '15px', height: '15px' }} />
                      Save & Continue with Google
                    </>
                  )}
                </button>
              </form>

              {/* Quick instructions */}
              <div style={{
                marginTop: '16px',
                padding: '10px 12px',
                borderRadius: '6px',
                backgroundColor: 'rgba(255,255,255,0.03)',
                border: '1px solid var(--df-border, rgba(255,255,255,0.08))',
                fontSize: '11px',
                color: 'var(--df-text-muted, #9ca3af)',
                lineHeight: 1.5,
              }}>
                <div style={{ fontWeight: 600, color: 'var(--df-text-soft, #d1d5db)', marginBottom: '4px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span>How to get a Client ID from Google Cloud:</span>
                  <a
                    href="https://console.cloud.google.com/apis/credentials"
                    target="_blank"
                    rel="noreferrer"
                    style={{ color: 'var(--df-accent, #c93b67)', display: 'inline-flex', alignItems: 'center', gap: '3px', textDecoration: 'none' }}
                  >
                    Console <ExternalLink style={{ width: '10px', height: '10px' }} />
                  </a>
                </div>
                <ol style={{ margin: 0, paddingLeft: '16px' }}>
                  <li>In Google Cloud Console, click <strong>Create Credentials &gt; OAuth client ID</strong>.</li>
                  <li>Select <strong>Web application</strong>.</li>
                  <li>Under <strong>Authorized JavaScript origins</strong>, add <code>http://localhost:5173</code>.</li>
                  <li>Paste the generated Client ID above or in <code>frontend/.env</code>.</li>
                </ol>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
