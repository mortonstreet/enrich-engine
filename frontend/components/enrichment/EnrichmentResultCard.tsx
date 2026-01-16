"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { DBEnrichment, EnrichmentStatus } from "@shared/types/src";
import { Mail, Phone, User, Building, Check, X, Clock, AlertCircle } from "lucide-react";

interface EnrichmentResultCardProps {
  enrichment: DBEnrichment;
}

const statusConfig = {
  [EnrichmentStatus.COMPLETED]: {
    label: "Found",
    icon: Check,
    className: "bg-green-100 text-green-800",
  },
  [EnrichmentStatus.NOT_FOUND]: {
    label: "Not Found",
    icon: X,
    className: "bg-yellow-100 text-yellow-800",
  },
  [EnrichmentStatus.ERROR]: {
    label: "Error",
    icon: AlertCircle,
    className: "bg-red-100 text-red-800",
  },
  [EnrichmentStatus.PENDING]: {
    label: "Processing",
    icon: Clock,
    className: "bg-blue-100 text-blue-800",
  },
};

export function EnrichmentResultCard({ enrichment }: EnrichmentResultCardProps) {
  const status = statusConfig[enrichment.status as EnrichmentStatus] || statusConfig[EnrichmentStatus.PENDING];
  const StatusIcon = status.icon;

  return (
    <Card>
      <CardHeader className="border-b">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Enrichment Result</CardTitle>
          <span
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${status.className}`}
          >
            <StatusIcon className="w-3.5 h-3.5" />
            {status.label}
          </span>
        </div>
      </CardHeader>
      <CardContent className="pt-4">
        {enrichment.status === EnrichmentStatus.COMPLETED ? (
          <div className="space-y-4">
            {(enrichment.firstName || enrichment.lastName) && (
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <User className="w-4 h-4 text-primary" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Name</p>
                  <p className="font-medium">
                    {[enrichment.firstName, enrichment.lastName].filter(Boolean).join(" ")}
                  </p>
                  {enrichment.title && (
                    <p className="text-sm text-muted-foreground">{enrichment.title}</p>
                  )}
                </div>
              </div>
            )}

            {enrichment.email && (
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <Mail className="w-4 h-4 text-primary" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Email</p>
                  <p className="font-medium">{enrichment.email}</p>
                  {enrichment.emailVerified && (
                    <span className="inline-flex items-center gap-1 text-xs text-green-600">
                      <Check className="w-3 h-3" />
                      Verified
                    </span>
                  )}
                </div>
              </div>
            )}

            {enrichment.mobile && (
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <Phone className="w-4 h-4 text-primary" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Mobile</p>
                  <p className="font-medium">{enrichment.mobile}</p>
                </div>
              </div>
            )}

            {(enrichment.companyName || enrichment.companyDomain) && (
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <Building className="w-4 h-4 text-primary" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Company</p>
                  <p className="font-medium">{enrichment.companyName || enrichment.companyDomain}</p>
                  {enrichment.companyName && enrichment.companyDomain && (
                    <p className="text-sm text-muted-foreground">{enrichment.companyDomain}</p>
                  )}
                </div>
              </div>
            )}
          </div>
        ) : enrichment.status === EnrichmentStatus.NOT_FOUND ? (
          <div className="text-center py-4">
            <p className="text-muted-foreground">No contact information found for this LinkedIn profile.</p>
          </div>
        ) : enrichment.status === EnrichmentStatus.ERROR ? (
          <div className="text-center py-4">
            <p className="text-destructive">An error occurred while enriching this profile.</p>
            {enrichment.errorCode && (
              <p className="text-xs text-muted-foreground mt-1">Error: {enrichment.errorCode}</p>
            )}
          </div>
        ) : (
          <div className="text-center py-4">
            <p className="text-muted-foreground">Enrichment in progress...</p>
          </div>
        )}

        <div className="mt-4 pt-4 border-t">
          <a
            href={enrichment.linkedinUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-primary hover:underline"
          >
            View LinkedIn Profile
          </a>
        </div>
      </CardContent>
    </Card>
  );
}
