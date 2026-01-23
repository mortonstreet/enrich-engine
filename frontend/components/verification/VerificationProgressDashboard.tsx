'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { Progress } from '@/components/ui/Progress';
import { Badge } from '@/components/ui/Badge';
import { Skeleton } from '@/components/ui/Skeleton';
import { CheckCircle2, XCircle, AlertTriangle, HelpCircle, Loader2 } from 'lucide-react';
import { VerificationStatsCard } from './VerificationStatsCard';
import { getVerificationStageLabel } from '@/hooks/api/useVerification';
import type { VerificationJobResponse } from '@shared/types/src';

interface VerificationProgressDashboardProps {
  job?: VerificationJobResponse;
  isLoading?: boolean;
}

function VerificationProgressDashboardSkeleton() {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <Skeleton className="h-6 w-40 mb-2" />
            <Skeleton className="h-4 w-24" />
          </div>
          <Skeleton className="h-6 w-20 rounded-full" />
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Progress Bar Skeleton */}
        <div className="space-y-2">
          <div className="flex justify-between">
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-4 w-24" />
          </div>
          <Skeleton className="h-3 w-full" />
          <div className="flex justify-between">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-3 w-28" />
          </div>
        </div>

        {/* Stats Grid Skeleton */}
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="rounded-lg border bg-card p-4">
              <div className="flex items-center gap-2 mb-2">
                <Skeleton className="h-5 w-5 rounded" />
                <Skeleton className="h-4 w-12" />
              </div>
              <Skeleton className="h-8 w-16 mb-1" />
              <Skeleton className="h-3 w-24" />
            </div>
          ))}
        </div>

        {/* Coverage Summary Skeleton */}
        <div className="rounded-lg bg-muted/50 p-4">
          <div className="flex items-center justify-between">
            <div>
              <Skeleton className="h-4 w-16 mb-1" />
              <Skeleton className="h-3 w-48" />
            </div>
            <div className="text-right">
              <Skeleton className="h-8 w-14 mb-1" />
              <Skeleton className="h-3 w-16" />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function VerificationProgressDashboard({ job, isLoading }: VerificationProgressDashboardProps) {
  if (isLoading || !job) {
    return <VerificationProgressDashboardSkeleton />;
  }

  const progressPercentage = job.totalEmails > 0
    ? Math.round((job.processedEmails / job.totalEmails) * 100)
    : 0;

  const isProcessing = job.verificationStage === 'smtp_verifying' || job.verificationStage === 'api_verifying';
  const isAwaitingDecision = job.verificationStage === 'awaiting_decision';
  const isCompleted = job.verificationStage === 'completed';

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg">Verification Progress</CardTitle>
            <CardDescription>{job.listName}</CardDescription>
          </div>
          <Badge
            variant={isCompleted ? 'default' : isAwaitingDecision ? 'secondary' : 'outline'}
            className={isProcessing ? 'animate-pulse' : ''}
          >
            {isProcessing && <Loader2 className="mr-2 h-3 w-3 animate-spin" aria-hidden="true" />}
            {getVerificationStageLabel(job.verificationStage)}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Progress Bar */}
        <div className="space-y-2" role="status" aria-live="polite">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Progress</span>
            <span className="font-medium">
              {job.processedEmails} / {job.totalEmails} emails
            </span>
          </div>
          <Progress value={progressPercentage} className="h-3" aria-label={`Verification progress: ${progressPercentage}% complete`} />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>{progressPercentage}% complete</span>
            <span>{job.coveragePercentage}% definitive coverage</span>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <VerificationStatsCard
            label="Valid"
            count={job.smtpValidCount}
            icon={CheckCircle2}
            iconClassName="text-green-500"
            description="Confirmed deliverable"
          />
          <VerificationStatsCard
            label="Invalid"
            count={job.smtpInvalidCount}
            icon={XCircle}
            iconClassName="text-red-500"
            description="Will bounce"
          />
          <VerificationStatsCard
            label="Catch-All"
            count={job.smtpCatchAllCount}
            icon={AlertTriangle}
            iconClassName="text-yellow-500"
            description="Domain accepts all"
          />
          <VerificationStatsCard
            label="Unknown"
            count={job.smtpUnknownCount}
            icon={HelpCircle}
            iconClassName="text-gray-400"
            description="Could not verify"
          />
        </div>

        {/* Coverage Summary */}
        <div className="rounded-lg bg-muted/50 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Coverage</p>
              <p className="text-xs text-muted-foreground">
                Percentage of emails with definitive status (valid or invalid)
              </p>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold">{job.coveragePercentage}%</p>
              <p className="text-xs text-muted-foreground">
                {job.smtpValidCount + job.smtpInvalidCount} of {job.totalEmails}
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
