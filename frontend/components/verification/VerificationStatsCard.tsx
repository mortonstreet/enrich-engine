'use client';

import { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface VerificationStatsCardProps {
  label: string;
  count: number;
  icon: LucideIcon;
  iconClassName?: string;
  description?: string;
  className?: string;
}

export function VerificationStatsCard({
  label,
  count,
  icon: Icon,
  iconClassName,
  description,
  className,
}: VerificationStatsCardProps) {
  return (
    <div className={cn('rounded-lg border bg-card p-4 text-card-foreground', className)}>
      <div className="flex items-center gap-2">
        <Icon className={cn('h-5 w-5', iconClassName)} aria-hidden="true" />
        <span className="text-sm font-medium text-muted-foreground">{label}</span>
      </div>
      <p className="mt-2 text-2xl font-bold tabular-nums">{count.toLocaleString()}</p>
      {description && (
        <p className="mt-1 text-xs text-muted-foreground">{description}</p>
      )}
    </div>
  );
}
