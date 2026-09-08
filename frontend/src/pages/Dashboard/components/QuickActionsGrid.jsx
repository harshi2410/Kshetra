import React from 'react';
import { useNavigate } from 'react-router-dom';
import { PlusCircle, UserPlus, CreditCard, FileUp, BarChart3, ArrowRight } from 'lucide-react';
import Card from '../../../components/ui/Card';

export default function QuickActionsGrid() {
  const navigate = useNavigate();

  const actions = [
    {
      label: 'New Project',
      description: 'Add a new land development site',
      icon: PlusCircle,
      path: '/projects',
      color: 'text-[var(--color-primary)]',
      bg: 'bg-[var(--color-primary)]/10'
    },
    {
      label: 'Add Customer',
      description: 'Register a new property buyer',
      icon: UserPlus,
      path: '/customers',
      color: 'text-[var(--color-info)]',
      bg: 'bg-[var(--color-info-bg)]'
    },
    {
      label: 'Record Payment',
      description: 'Log installment or down payment',
      icon: CreditCard,
      path: '/payments',
      color: 'text-[var(--color-success)]',
      bg: 'bg-[var(--color-success-bg)]'
    },
    {
      label: 'Upload Document',
      description: 'Store agreement or RERA file',
      icon: FileUp,
      path: '/documents',
      color: 'text-[var(--color-accent-dark)]',
      bg: 'bg-[var(--color-accent)]/15'
    },
    {
      label: 'Open Analytics',
      description: 'View sales & revenue charts',
      icon: BarChart3,
      path: '/analytics',
      color: 'text-[var(--color-primary)]',
      bg: 'bg-[var(--color-primary)]/10'
    }
  ];

  return (
    <Card className="p-5 sm:p-6 shadow-xs">
      <div className="mb-4">
        <h3 className="text-base font-semibold text-[var(--color-text-primary)] font-display">
          Operational Quick Actions
        </h3>
        <p className="text-xs text-[var(--color-text-secondary)] mt-0.5">
          Direct shortcuts to core workflows and system modules
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
        {actions.map((act) => {
          const Icon = act.icon;
          return (
            <button
              key={act.label}
              onClick={() => navigate(act.path)}
              className="p-4 rounded-[var(--radius-md)] border border-[var(--color-border-subtle)] bg-[var(--color-bg-surface)] hover:bg-[var(--color-bg-surface-hover)] hover:border-[var(--color-primary)]/40 transition-all text-left group flex flex-col justify-between h-36 cursor-pointer shadow-xs"
            >
              <div className="flex items-center justify-between w-full">
                <div className={`p-2.5 rounded-lg ${act.bg} ${act.color}`}>
                  <Icon className="w-5 h-5 stroke-[2]" />
                </div>
                <ArrowRight className="w-4 h-4 text-[var(--color-text-muted)] group-hover:text-[var(--color-primary)] group-hover:translate-x-1 transition-all" />
              </div>

              <div>
                <h4 className="text-xs font-bold text-[var(--color-text-primary)] group-hover:text-[var(--color-primary)] transition-colors">
                  {act.label}
                </h4>
                <p className="text-[11px] text-[var(--color-text-muted)] mt-1 line-clamp-2 leading-relaxed">
                  {act.description}
                </p>
              </div>
            </button>
          );
        })}
      </div>
    </Card>
  );
}
