import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Building2, Mail, ArrowLeft, CheckCircle2, AlertCircle } from 'lucide-react';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import authService from '../../auth/authService';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMessage('');

    if (!email.trim()) {
      setError('Email address is required');
      return;
    }

    setLoading(true);
    try {
      const res = await authService.requestPasswordReset(email);
      setSuccessMessage(res.message);
    } catch (err) {
      setError(err.message || 'Failed to request password reset');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex flex-col justify-between bg-[var(--color-bg-app)] text-[var(--color-text-primary)] font-sans antialiased relative overflow-hidden">
      
      {/* Decorative Blur Backgrounds */}
      <div className="absolute top-0 left-0 -mt-20 -ml-20 w-96 h-96 rounded-full bg-[var(--color-primary)]/5 blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 right-0 -mb-20 -mr-20 w-96 h-96 rounded-full bg-[var(--color-accent)]/10 blur-3xl pointer-events-none" />

      {/* Main Container */}
      <div className="flex-1 flex items-center justify-center p-4 sm:p-6 lg:p-8 z-10">
        <div className="w-full max-w-md space-y-6 animate-page-fade">
          
          {/* Brand Header */}
          <div className="text-center space-y-3">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-[var(--radius-lg)] bg-[var(--color-primary)] text-white shadow-[var(--shadow-elevated)] ring-4 ring-[var(--color-primary)]/10 mb-1">
              <Building2 className="w-9 h-9 stroke-[1.75]" />
            </div>
            
            <h1 className="text-2xl sm:text-3xl font-bold font-display tracking-tight text-[var(--color-text-primary)]">
              Land<span className="text-[var(--color-primary)]">OS</span>
            </h1>
          </div>

          {/* Form Card */}
          <div className="bg-[var(--color-bg-surface)] border border-[var(--color-border-subtle)] rounded-[var(--radius-lg)] p-6 sm:p-8 shadow-[var(--shadow-elevated)]">
            
            <div className="mb-6">
              <h2 className="text-lg font-semibold text-[var(--color-text-primary)]">Reset Your Password</h2>
              <p className="text-xs text-[var(--color-text-secondary)] mt-1">
                Enter your registered email address and we'll send you instructions to reset your password.
              </p>
            </div>

            {/* Success Banner */}
            {successMessage ? (
              <div className="space-y-4 animate-landos-slide-up">
                <div className="p-4 rounded-[var(--radius-md)] bg-[var(--color-success-bg)] border border-[var(--color-success)]/20 text-[var(--color-success)] text-xs flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 shrink-0 text-[var(--color-success)] mt-0.5" />
                  <div>
                    <span className="font-semibold block mb-0.5">Reset Email Sent</span>
                    <span>{successMessage}</span>
                  </div>
                </div>

                <p className="text-xs text-[var(--color-text-secondary)] text-center">
                  Did not receive an email? Check your spam folder or try again.
                </p>

                <Button
                  variant="secondary"
                  fullWidth
                  onClick={() => setSuccessMessage('')}
                >
                  Try Another Email
                </Button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} noValidate className="space-y-4">
                
                {error && (
                  <div className="p-3.5 rounded-[var(--radius-md)] bg-[var(--color-danger-bg)] border border-[var(--color-danger)]/20 text-[var(--color-danger)] text-xs flex items-center gap-2.5 animate-landos-slide-up">
                    <AlertCircle className="w-4 h-4 shrink-0 text-[var(--color-danger)]" />
                    <span>{error}</span>
                  </div>
                )}

                <Input
                  label="Registered Email Address"
                  type="email"
                  placeholder="name@landos.com"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (error) setError('');
                  }}
                  required
                  prefixIcon={<Mail className="w-4 h-4" />}
                  disabled={loading}
                />

                <div className="pt-2">
                  <Button
                    type="submit"
                    variant="primary"
                    size="lg"
                    loading={loading}
                    disabled={loading}
                    fullWidth
                  >
                    {loading ? 'Sending Link...' : 'Send Password Reset Link'}
                  </Button>
                </div>
              </form>
            )}

            {/* Back to Login Link */}
            <div className="mt-6 pt-4 border-t border-[var(--color-border-subtle)] text-center">
              <Link
                to="/login"
                className="inline-flex items-center gap-2 text-xs font-semibold text-[var(--color-text-secondary)] hover:text-[var(--color-primary)] transition-colors"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                Back to Sign In
              </Link>
            </div>

          </div>

        </div>
      </div>

      {/* Footer */}
      <footer className="py-4 text-center text-xs text-[var(--color-text-muted)] border-t border-[var(--color-border-subtle)]/50 z-10 bg-[var(--color-bg-app)]/80">
        LandOS Enterprise Suite &bull; Password Recovery
      </footer>
    </div>
  );
}
