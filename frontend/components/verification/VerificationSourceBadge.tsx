'use client';

import { Badge } from '@/components/ui/Badge';
import { Zap, Server } from 'lucide-react';
import type { VerificationSource } from '@shared/types/src';

interface VerificationSourceBadgeProps {
  source: VerificationSource;
  className?: string;
}

export function VerificationSourceBadge({ source, className }: VerificationSourceBadgeProps) {
  if (source === 'smtp') {
    return (
      <Badge variant="outline" className={className}>
        <Zap className="mr-1 h-3 w-3" />
        SMTP
      </Badge>
    );
  }

  return (
    <Badge variant="secondary" className={className}>
      <Server className="mr-1 h-3 w-3" />
      API
    </Badge>
  );
}
