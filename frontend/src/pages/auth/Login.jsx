import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { AlertCircle, Eye, EyeOff, Map, TrendingUp, Users, Shield } from 'lucide-react';
import useAuth from '../../auth/useAuth';

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, isAuthenticated } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState({});
  const [authError, setAuthError] = useState('');
  const [loading, setLoading] = useState(false);

  const from = location.state?.from?.pathname || '/dashboard';

  useEffect(() => {
    if (isAuthenticated) navigate(from, { replace: true });
  }, [isAuthenticated, navigate, from]);

  const validate = () => {
    const e = {};
    if (!email.trim()) e.email = 'Email is required';
    else if (!/\S+@\S+\.\S+/.test(email)) e.email = 'Enter a valid email';
    if (!password) e.password = 'Password is required';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (ev) => {
    ev.preventDefault();
    setAuthError('');
    if (!validate()) return;
    setLoading(true);
    try {
      await login({ email, password, rememberMe });
      navigate(from, { replace: true });
    } catch (err) {
      setAuthError(err.message || 'Invalid credentials. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  /* ── shared input style ── */
  const inputStyle = (hasError) => ({
    width: '100%',
    height: '48px',
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
    { icon: Map, text: 'Manage all your real estate projects' },
    { icon: Users, text: 'Track customers & broker networks' },
    { icon: TrendingUp, text: 'Monitor revenue & plot sales in real-time' },
    { icon: Shield, text: 'Secure, role-based access control' },
  ];

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: '1fr 1fr',
      minHeight: '100dvh',
      fontFamily: 'var(--font-sans)',
    }}>

      {/* ══════════════════════════════════════════
          LEFT — Brand Panel
      ══════════════════════════════════════════ */}
      <div style={{
        background: 'linear-gradient(145deg, #7A1E3A 0%, #5E152C 60%, #4A0F22 100%)',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        padding: '3rem 3.5rem',
        position: 'relative',
        overflow: 'hidden',
      }}>
        {/* Decorative blobs */}
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
            ENTERPRISE
          </span>
          <h1 style={{
            fontSize: '3.5rem', fontWeight: 300, lineHeight: 1.15,
            letterSpacing: '-0.03em', color: '#FFFFFF',
            margin: '8px 0 0', fontFamily: 'var(--font-display)',
          }}>
            Land<span style={{ fontWeight: 700 }}>OS</span>
          </h1>
          <p style={{
            fontSize: '1.05rem', color: 'rgba(255,255,255,0.65)',
            lineHeight: 1.6, marginTop: '12px', maxWidth: '360px',
          }}>
            Real estate portfolio & operations command center for modern developers.
          </p>
        </div>

        {/* Feature list */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', position: 'relative', zIndex: 1 }}>
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
        padding: '2rem 4rem',
      }}>
        <div style={{ width: '100%', maxWidth: '380px' }}>

          {/* Form header */}
          <div style={{ marginBottom: '2rem' }}>
            <h2 style={{
              fontSize: '2rem', fontWeight: 400, color: 'var(--df-text)',
              letterSpacing: '-0.02em', lineHeight: 1.2,
              fontFamily: 'var(--font-display)', margin: '0 0 8px',
            }}>
              Welcome back
            </h2>
            <p style={{ fontSize: '14px', color: 'var(--df-text-muted)', margin: 0 }}>
              Sign in to your LandOS workspace
            </p>
          </div>

          {/* Quick fill hint */}
          <div style={{
            padding: '8px 12px', borderRadius: '6px', marginBottom: '20px',
            backgroundColor: 'var(--df-accent-soft)',
            border: '1px solid rgba(122,30,58,0.15)',
            fontSize: '12px', color: 'var(--df-accent)',
            display: 'flex', alignItems: 'center', gap: '8px',
          }}>
            <Shield style={{ width: '13px', height: '13px', flexShrink: 0 }} />
            <span>Use <strong>admin@landos.com</strong> / <strong>admin123</strong></span>
          </div>

          {/* Error */}
          {authError && (
            <div style={{
              padding: '10px 12px', borderRadius: '6px', marginBottom: '16px',
              backgroundColor: 'rgba(185,28,28,0.06)',
              border: '1px solid rgba(185,28,28,0.2)',
              fontSize: '12.5px', color: 'var(--df-danger)',
              display: 'flex', alignItems: 'center', gap: '8px',
            }}>
              <AlertCircle style={{ width: '14px', height: '14px', flexShrink: 0 }} />
              {authError}
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} noValidate style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

            {/* Email */}
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: 'var(--df-text-soft)', marginBottom: '6px' }}>
                Email address
              </label>
              <input
                id="login-email"
                type="email"
                value={email}
                onChange={e => { setEmail(e.target.value); setErrors(p => ({ ...p, email: '' })); }}
                placeholder="admin@landos.com"
                autoComplete="email"
                style={inputStyle(errors.email)}
                onFocus={e => { e.target.style.borderColor = 'var(--df-accent)'; e.target.style.boxShadow = '0 0 0 3px var(--df-accent-soft)'; }}
                onBlur={e => { e.target.style.borderColor = errors.email ? 'var(--df-danger)' : 'var(--df-border-input)'; e.target.style.boxShadow = 'none'; }}
              />
              {errors.email && (
                <p style={{ fontSize: '11.5px', color: 'var(--df-danger)', marginTop: '4px' }}>{errors.email}</p>
              )}
            </div>

            {/* Password */}
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: 'var(--df-text-soft)', marginBottom: '6px' }}>
                Password
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  id="login-password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={e => { setPassword(e.target.value); setErrors(p => ({ ...p, password: '' })); }}
                  placeholder="••••••••"
                  autoComplete="current-password"
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
              {errors.password && (
                <p style={{ fontSize: '11.5px', color: 'var(--df-danger)', marginTop: '4px' }}>{errors.password}</p>
              )}
            </div>

            {/* Remember me */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={e => setRememberMe(e.target.checked)}
                  style={{ width: '14px', height: '14px', accentColor: 'var(--df-accent)', cursor: 'pointer' }}
                />
                <span style={{ fontSize: '13px', color: 'var(--df-text-muted)' }}>Remember me</span>
              </label>
              <button
                type="button"
                style={{ fontSize: '13px', color: 'var(--df-accent)', background: 'transparent', border: 'none', cursor: 'pointer', padding: 0 }}
              >
                Forgot password?
              </button>
            </div>

            {/* Submit */}
            <button
              id="login-submit"
              type="submit"
              disabled={loading}
              style={{
                width: '100%', height: '48px',
                backgroundColor: loading ? 'rgba(122,30,58,0.6)' : 'var(--df-accent)',
                color: '#FFFFFF',
                border: 'none', borderRadius: '8px',
                fontSize: '14px', fontWeight: 600,
                cursor: loading ? 'not-allowed' : 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                transition: 'background-color 0.15s, box-shadow 0.15s',
                boxShadow: '0 4px 14px rgba(122,30,58,0.25)',
                fontFamily: 'var(--font-sans)',
              }}
              onMouseEnter={e => { if (!loading) e.currentTarget.style.backgroundColor = 'var(--df-accent-alt)'; }}
              onMouseLeave={e => { if (!loading) e.currentTarget.style.backgroundColor = 'var(--df-accent)'; }}
            >
              {loading ? (
                <>
                  <span style={{
                    width: '16px', height: '16px', border: '2px solid rgba(255,255,255,0.3)',
                    borderTopColor: '#fff', borderRadius: '50%',
                    animation: 'landos-spin 0.7s linear infinite',
                    display: 'inline-block',
                  }} />
                  Signing in…
                </>
              ) : 'Sign in to LandOS'}
            </button>

          </form>

          {/* Footer note */}
          <p style={{ fontSize: '11.5px', color: 'var(--df-text-muted)', textAlign: 'center', marginTop: '2rem' }}>
            Protected by enterprise-grade security.
            <br />Contact your administrator to reset access.
          </p>
        </div>
      </div>

    </div>
  );
}
