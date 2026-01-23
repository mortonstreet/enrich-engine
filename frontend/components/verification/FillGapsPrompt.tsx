'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/Badge';
import { AlertCircle, Check, DollarSign, Loader2 } from 'lucide-react';
import { useVerificationEstimate, useSubmitVerificationDecision } from '@/hooks/api/useVerification';
import type { UserDecision, VerificationJobResponse } from '@shared/types/src';

interface FillGapsPromptProps {
  job: VerificationJobResponse;
  onDecisionSubmitted?: () => void;
}

export function FillGapsPrompt({ job, onDecisionSubmitted }: FillGapsPromptProps) {
  const [selectedDecision, setSelectedDecision] = useState<UserDecision>('accept_current');
  const { data: estimate } = useVerificationEstimate(job.id);
  const submitDecision = useSubmitVerificationDecision();

  const handleSubmit = async () => {
    await submitDecision.mutateAsync({
      jobId: job.id,
      decision: selectedDecision,
    });
    onDecisionSubmitted?.();
  };

  const options = [
    {
      id: 'accept_current' as UserDecision,
      label: 'Accept Current Results',
      description: `Keep ${job.coveragePercentage}% definitive coverage`,
      cost: 0,
      badge: 'Free',
    },
    {
      id: 'fill_unknowns_only' as UserDecision,
      label: 'Verify Unknowns Only',
      description: `Verify ${estimate?.unknownCount ?? job.smtpUnknownCount} emails that couldn't be checked`,
      cost: estimate?.fillUnknownsCost ?? 0,
      badge: 'Recommended',
    },
    {
      id: 'fill_catchall_only' as UserDecision,
      label: 'Verify Catch-Alls Only',
      description: `Verify ${estimate?.catchAllCount ?? job.smtpCatchAllCount} emails from catch-all domains`,
      cost: estimate?.fillCatchAllCost ?? 0,
      badge: null,
    },
    {
      id: 'fill_all_gaps' as UserDecision,
      label: 'Verify All Gaps',
      description: `Verify all ${estimate?.totalGapCount ?? (job.smtpUnknownCount + job.smtpCatchAllCount)} unverified emails`,
      cost: estimate?.fillAllGapsCost ?? 0,
      badge: 'Best Coverage',
    },
  ];

  return (
    <Card className="border-primary/50">
      <CardHeader>
        <div className="flex items-start gap-4">
          <div className="rounded-lg bg-primary/10 p-2">
            <AlertCircle className="h-6 w-6 text-primary" aria-hidden="true" />
          </div>
          <div>
            <CardTitle>SMTP Verification Complete</CardTitle>
            <CardDescription className="mt-1">
              {job.coveragePercentage}% of emails have been definitively verified.
              Would you like to fill the gaps using our API?
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <RadioGroup
          value={selectedDecision}
          onValueChange={(val) => setSelectedDecision(val as UserDecision)}
          className="space-y-3"
          aria-label="Choose gap-filling option"
        >
          {options.map((option) => (
            <div key={option.id} className="relative">
              <RadioGroupItem
                value={option.id}
                id={option.id}
                className="peer sr-only"
              />
              <Label
                htmlFor={option.id}
                className={`
                  flex cursor-pointer items-center justify-between rounded-lg border p-4 transition-all
                  peer-focus-visible:ring-2 peer-focus-visible:ring-ring peer-focus-visible:ring-offset-2
                  ${selectedDecision === option.id
                    ? 'border-primary bg-primary/5'
                    : 'border-muted hover:border-muted-foreground/50'
                  }
                `}
              >
                <div className="flex items-center gap-3">
                  <div className={`h-4 w-4 rounded-full border-2 ${
                    selectedDecision === option.id
                      ? 'border-primary bg-primary'
                      : 'border-muted-foreground'
                  }`}>
                    {selectedDecision === option.id && (
                      <div className="h-full w-full flex items-center justify-center">
                        <div className="h-1.5 w-1.5 rounded-full bg-white" />
                      </div>
                    )}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{option.label}</span>
                      {option.badge && (
                        <Badge variant={option.badge === 'Recommended' ? 'default' : 'secondary'} className="text-xs">
                          {option.badge}
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">{option.description}</p>
                  </div>
                </div>
                <div className="flex items-center gap-1 text-right" aria-label={option.cost > 0 ? `Cost: $${option.cost.toFixed(2)}` : 'Cost: Free'}>
                  {option.cost > 0 ? (
                    <>
                      <DollarSign className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                      <span className="font-semibold">${option.cost.toFixed(2)}</span>
                    </>
                  ) : (
                    <span className="text-green-600 font-medium">Free</span>
                  )}
                </div>
              </Label>
            </div>
          ))}
        </RadioGroup>

        {estimate && selectedDecision !== 'accept_current' && (
          <div className="mt-4 rounded-lg bg-muted/50 p-4">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Current coverage</span>
              <span>{estimate.currentCoveragePercentage}%</span>
            </div>
            <div className="flex justify-between text-sm mt-1">
              <span className="text-muted-foreground">Projected coverage</span>
              <span className="text-green-600 font-medium">{estimate.projectedCoveragePercentage}%</span>
            </div>
          </div>
        )}
      </CardContent>
      <CardFooter>
        <Button
          onClick={handleSubmit}
          disabled={submitDecision.isPending}
          className="w-full"
        >
          {submitDecision.isPending ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
              Processing...
            </>
          ) : (
            <>
              <Check className="mr-2 h-4 w-4" aria-hidden="true" />
              Confirm Decision
            </>
          )}
        </Button>
      </CardFooter>
    </Card>
  );
}
