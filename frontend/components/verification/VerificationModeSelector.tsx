'use client';

import { useState } from 'react';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/Badge';
import { Zap, Server, DollarSign, Clock } from 'lucide-react';
import type { VerificationMethod } from '@shared/types/src';

interface VerificationModeSelectorProps {
  value: VerificationMethod;
  onChange: (value: VerificationMethod) => void;
  disabled?: boolean;
}

const modes = [
  {
    id: 'smtp_only' as VerificationMethod,
    name: 'SMTP Only',
    description: 'Fast and free verification via direct SMTP checks',
    badge: 'Free',
    badgeVariant: 'default' as const,
    icon: Zap,
    features: [
      'Verifies 1000+ emails in minutes',
      'No external API costs',
      '~85% accuracy for most domains',
    ],
    recommended: true,
  },
  {
    id: 'smtp_api_fallback' as VerificationMethod,
    name: 'SMTP + API Fallback',
    description: 'Start with SMTP, optionally fill gaps with paid API',
    badge: 'Hybrid',
    badgeVariant: 'secondary' as const,
    icon: Server,
    features: [
      'Best of both worlds',
      'Choose to fill gaps after SMTP',
      'Pay only for unknowns/catch-alls',
    ],
    recommended: false,
  },
  {
    id: 'api_only' as VerificationMethod,
    name: 'API Only',
    description: 'Use MillionVerifier API for all emails',
    badge: 'Paid',
    badgeVariant: 'outline' as const,
    icon: DollarSign,
    features: [
      'Highest accuracy (~99%)',
      '$0.0005 per email',
      'Slower processing time',
    ],
    recommended: false,
  },
];

export function VerificationModeSelector({
  value,
  onChange,
  disabled = false,
}: VerificationModeSelectorProps) {
  return (
    <RadioGroup
      value={value}
      onValueChange={(val) => onChange(val as VerificationMethod)}
      disabled={disabled}
      className="grid gap-4"
      aria-label="Select verification method"
    >
      {modes.map((mode) => {
        const Icon = mode.icon;
        const isSelected = value === mode.id;

        return (
          <div key={mode.id} className="relative">
            <RadioGroupItem
              value={mode.id}
              id={mode.id}
              className="peer sr-only"
            />
            <Label
              htmlFor={mode.id}
              className={`
                flex cursor-pointer flex-col rounded-lg border-2 p-4 transition-all
                peer-focus-visible:ring-2 peer-focus-visible:ring-ring peer-focus-visible:ring-offset-2
                ${isSelected
                  ? 'border-primary bg-primary/5'
                  : 'border-muted hover:border-muted-foreground/50'
                }
                ${disabled ? 'cursor-not-allowed opacity-50' : ''}
              `}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className={`rounded-lg p-2 ${isSelected ? 'bg-primary/10' : 'bg-muted'}`}>
                    <Icon className={`h-5 w-5 ${isSelected ? 'text-primary' : 'text-muted-foreground'}`} aria-hidden="true" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold">{mode.name}</span>
                      <Badge variant={mode.badgeVariant}>{mode.badge}</Badge>
                      {mode.recommended && (
                        <Badge variant="default" className="bg-green-600">
                          Recommended
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">{mode.description}</p>
                  </div>
                </div>
                <div className={`h-4 w-4 rounded-full border-2 ${
                  isSelected ? 'border-primary bg-primary' : 'border-muted-foreground'
                }`}>
                  {isSelected && (
                    <div className="h-full w-full flex items-center justify-center">
                      <div className="h-1.5 w-1.5 rounded-full bg-white" />
                    </div>
                  )}
                </div>
              </div>
              <ul className="mt-3 ml-12 space-y-1 text-sm text-muted-foreground">
                {mode.features.map((feature, idx) => (
                  <li key={idx} className="flex items-center gap-2">
                    <span className="text-green-500" aria-hidden="true">✓</span>
                    {feature}
                  </li>
                ))}
              </ul>
            </Label>
          </div>
        );
      })}
    </RadioGroup>
  );
}
