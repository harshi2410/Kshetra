import React from 'react';
import { Calendar, Sparkles, Plus, UserPlus, CreditCard } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import useAuth from '../../../auth/useAuth';
import Button from '../../../components/ui/Button';

export default function WelcomeHeader() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 18) return 'Good Afternoon';
    return 'Good Evening';
  };

  const formattedDate = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  return (
    <div className="bg-[var(--color-bg-surface)] border border-[var(--color-border-subtle)] rounded-[var(--radius-lg)] p-5 sm:p-7 shadow-[var(--shadow-card)] relative overflow-hidden transition-all duration-200">
      {/* Decorative Gradient Background */}
      <div className="absolute top-0 right-0 w-96 h-full bg-gradient-to-l from-[var(--color-primary)]/10 via-[var(--color-accent)]/5 to-transparent pointer-events-none" />

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-5 relative z-10">
        
        {/* Left Side: Greeting & Status */}
        <div className="space-y-2 max-w-2xl">
          <div className="flex flex-wrap items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[var(--color-primary)]">
            <span className="inline-flex items-center gap-1 bg-[var(--color-primary)]/10 px-2.5 py-1 rounded-full text-[11px]">
              <Sparkles className="w-3.5 h-3.5 text-[var(--color-accent-dark)]" />
              LandOS Executive Command
            </span>
            <span className="text-[var(--color-text-muted)]">•</span>
            <span className="inline-flex items-center gap-1.5 text-[var(--color-text-secondary)] font-normal normal-case">
              <Calendar className="w-3.5 h-3.5 text-[var(--color-text-muted)]" />
              {formattedDate}
            </span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-bold font-display text-[var(--color-text-primary)] tracking-tight">
            {getGreeting()}, {user?.name ? user.name.split(' ')[0] : 'Shivam'} 👋
          </h1>

          <p className="text-xs sm:text-sm text-[var(--color-text-secondary)] leading-relaxed">
            Real estate portfolio & operations command center. Track developments, plot sales, customer payouts, and revenue metrics in real-time.
          </p>
        </div>

        {/* Right Side: Quick Shortcuts */}
        <div className="flex flex-wrap items-center gap-2.5 shrink-0 pt-2 md:pt-0">
          <Button
            variant="secondary"
            size="sm"
            leftIcon={<Plus className="w-3.5 h-3.5 text-[var(--color-primary)]" />}
            onClick={() => navigate('/projects')}
          >
            New Project
          </Button>

          <Button
            variant="secondary"
            size="sm"
            leftIcon={<UserPlus className="w-3.5 h-3.5 text-[var(--color-primary)]" />}
            onClick={() => navigate('/customers')}
          >
            Add Customer
          </Button>

          <Button
            variant="primary"
            size="sm"
            leftIcon={<CreditCard className="w-3.5 h-3.5" />}
            onClick={() => navigate('/payments')}
          >
            Record Payment
          </Button>
        </div>

      </div>
    </div>
  );
}
