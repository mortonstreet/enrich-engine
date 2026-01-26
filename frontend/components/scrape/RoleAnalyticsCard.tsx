"use client";

import { RoleAnalyticsResponse } from "@shared/types/src";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { BarChart3, Lightbulb, TrendingUp, TrendingDown, Minus } from "lucide-react";

interface RoleAnalyticsCardProps {
  analytics: RoleAnalyticsResponse;
  selectedRole: string | null;
  onRoleSelect: (role: string | null) => void;
}

export function RoleAnalyticsCard({
  analytics,
  selectedRole,
  onRoleSelect,
}: RoleAnalyticsCardProps) {
  if (analytics.analytics.length === 0) {
    return null;
  }

  const getHitRateColor = (hitRate: number) => {
    if (hitRate > 70) return "text-green-600";
    if (hitRate >= 40) return "text-yellow-600";
    return "text-red-600";
  };

  const getHitRateBg = (hitRate: number) => {
    if (hitRate > 70) return "bg-green-100 dark:bg-green-950/30";
    if (hitRate >= 40) return "bg-yellow-100 dark:bg-yellow-950/30";
    return "bg-red-100 dark:bg-red-950/30";
  };

  const getHitRateIcon = (hitRate: number) => {
    if (hitRate > 70) return <TrendingUp className="w-4 h-4 text-green-600" />;
    if (hitRate >= 40) return <Minus className="w-4 h-4 text-yellow-600" />;
    return <TrendingDown className="w-4 h-4 text-red-600" />;
  };

  // Sort by hit rate descending
  const sortedAnalytics = [...analytics.analytics].sort((a, b) => b.hitRate - a.hitRate);

  return (
    <Card>
      <CardHeader className="border-b">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5" />
              Role Analytics
            </CardTitle>
            <CardDescription>
              Hit rate breakdown by role
            </CardDescription>
          </div>
          {selectedRole && (
            <Button variant="ghost" size="sm" onClick={() => onRoleSelect(null)}>
              Clear Filter
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="pt-4">
        <div className="space-y-4">
          {/* Role breakdown */}
          <div className="space-y-2">
            {sortedAnalytics.map((role) => (
              <button
                key={role.roleName}
                onClick={() => onRoleSelect(selectedRole === role.roleName ? null : role.roleName)}
                className={`w-full flex items-center justify-between p-3 rounded-lg border transition-colors ${
                  selectedRole === role.roleName
                    ? "border-primary bg-primary/5"
                    : "border-transparent hover:bg-muted/50"
                } ${getHitRateBg(role.hitRate)}`}
              >
                <div className="flex items-center gap-3">
                  {getHitRateIcon(role.hitRate)}
                  <div className="text-left">
                    <p className="font-medium text-sm">{role.roleName}</p>
                    <p className="text-xs text-muted-foreground">
                      {role.found} found / {role.total} total
                    </p>
                  </div>
                </div>
                <div className={`text-lg font-bold ${getHitRateColor(role.hitRate)}`}>
                  {role.hitRate}%
                </div>
              </button>
            ))}
          </div>

          {/* Suggestions for low hit-rate roles */}
          {analytics.suggestions.length > 0 && (
            <div className="pt-4 border-t">
              <div className="flex items-center gap-2 mb-3">
                <Lightbulb className="w-4 h-4 text-amber-500" />
                <h4 className="text-sm font-medium">Suggestions</h4>
              </div>
              <div className="space-y-3">
                {analytics.suggestions.map((suggestion) => (
                  <div
                    key={suggestion.originalRole}
                    className="p-3 bg-amber-50 dark:bg-amber-950/30 rounded-lg text-sm"
                  >
                    <p className="text-amber-800 dark:text-amber-200">
                      <span className="font-medium">{suggestion.originalRole}</span>: {suggestion.reason}
                    </p>
                    <p className="text-amber-700 dark:text-amber-300 mt-1">
                      Try: {suggestion.suggestedRoles.join(", ")}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
