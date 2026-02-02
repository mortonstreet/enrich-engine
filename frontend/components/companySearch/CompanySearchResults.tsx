"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/base-input";
import { Download, Users, ExternalLink, Loader2, Plus, Minus } from "lucide-react";
import {
  DBCompanySearchItem,
  DBCompanySearchJob,
  RoleConfig,
} from "@shared/types/src";
import {
  downloadCompanySearchResults,
  useCreatePeopleSearchFromCompanies,
} from "@/hooks/api/useCompanySearch";

interface CompanySearchResultsProps {
  job: DBCompanySearchJob;
  items: DBCompanySearchItem[];
}

export function CompanySearchResults({ job, items }: CompanySearchResultsProps) {
  const [showPeopleSearch, setShowPeopleSearch] = useState(false);
  const [roleConfigs, setRoleConfigs] = useState<RoleConfig[]>([
    { roleName: "", count: 1 },
  ]);
  const [jobName, setJobName] = useState("");

  const createPeopleSearch = useCreatePeopleSearchFromCompanies();

  const addRole = () => {
    if (roleConfigs.length < 10) {
      setRoleConfigs([...roleConfigs, { roleName: "", count: 1 }]);
    }
  };

  const removeRole = (index: number) => {
    setRoleConfigs(roleConfigs.filter((_, i) => i !== index));
  };

  const updateRole = (index: number, field: keyof RoleConfig, value: string | number) => {
    const updated = [...roleConfigs];
    updated[index] = { ...updated[index], [field]: value };
    setRoleConfigs(updated);
  };

  const handleStartPeopleSearch = async () => {
    const validRoles = roleConfigs.filter((r) => r.roleName.trim());
    if (validRoles.length === 0) return;

    await createPeopleSearch.mutateAsync({
      jobId: job.id,
      name: jobName || undefined,
      roleConfigs: validRoles,
    });
  };

  return (
    <div className="space-y-4">
      {/* Results table */}
      <div className="bg-card border rounded-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-base font-semibold">
              {items.length} Unique Companies Found
            </h3>
            <p className="text-sm text-muted-foreground">
              {job.rawResultCount} raw results deduplicated to {job.dedupedResultCount}
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => downloadCompanySearchResults(job.id)}
            >
              <Download className="w-4 h-4 mr-1.5" />
              CSV
            </Button>
            <Button
              size="sm"
              onClick={() => setShowPeopleSearch(!showPeopleSearch)}
            >
              <Users className="w-4 h-4 mr-1.5" />
              Find People
            </Button>
          </div>
        </div>

        <div className="border rounded-lg overflow-hidden">
          <div className="overflow-x-auto max-h-96">
            <table className="w-full min-w-[400px]">
              <thead className="bg-muted/50 sticky top-0">
                <tr>
                  <th className="text-left text-sm font-medium text-muted-foreground px-4 py-2">#</th>
                  <th className="text-left text-sm font-medium text-muted-foreground px-4 py-2">Company</th>
                  <th className="text-right text-sm font-medium text-muted-foreground px-4 py-2">LinkedIn</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {items.slice(0, 100).map((item, idx) => (
                  <tr key={item.id} className="hover:bg-muted/30">
                    <td className="px-4 py-2 text-sm text-muted-foreground">{idx + 1}</td>
                    <td className="px-4 py-2 text-sm font-medium">{item.companyName}</td>
                    <td className="px-4 py-2 text-right">
                      {item.linkedinUrl && (
                        <a
                          href={item.linkedinUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:underline inline-flex items-center gap-1 text-sm"
                        >
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {items.length > 100 && (
            <div className="text-center py-2 text-sm text-muted-foreground bg-muted/30">
              Showing first 100 of {items.length} companies. Download CSV for full list.
            </div>
          )}
        </div>
      </div>

      {/* People Search Configuration */}
      {showPeopleSearch && (
        <div className="bg-card border rounded-xl p-6">
          <h3 className="text-base font-semibold mb-1">Configure People Search</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Search for people at these {items.length} companies. Add roles and specify how many people per role.
          </p>

          <div className="mb-4">
            <label className="text-sm font-medium text-muted-foreground mb-1.5 block">
              Job Name (optional)
            </label>
            <Input
              value={jobName}
              onChange={(e) => setJobName(e.target.value)}
              placeholder={`People Search - ${job.name}`}
            />
          </div>

          <div className="space-y-3 mb-4">
            {roleConfigs.map((config, idx) => (
              <div key={idx} className="flex items-center gap-3">
                <div className="flex-1">
                  <Input
                    value={config.roleName}
                    onChange={(e) => updateRole(idx, "roleName", e.target.value)}
                    placeholder="e.g. VP of Sales, CFO, Managing Director"
                  />
                </div>
                <div className="w-20">
                  <Input
                    type="number"
                    min={1}
                    max={10}
                    value={config.count}
                    onChange={(e) =>
                      updateRole(idx, "count", Math.min(10, Math.max(1, parseInt(e.target.value) || 1)))
                    }
                  />
                </div>
                {roleConfigs.length > 1 && (
                  <Button variant="ghost" size="sm" onClick={() => removeRole(idx)}>
                    <Minus className="w-4 h-4" />
                  </Button>
                )}
              </div>
            ))}
          </div>

          <div className="flex gap-3">
            <Button variant="outline" size="sm" onClick={addRole} disabled={roleConfigs.length >= 10}>
              <Plus className="w-4 h-4 mr-1.5" />
              Add Role
            </Button>
            <Button
              onClick={handleStartPeopleSearch}
              disabled={
                createPeopleSearch.isPending ||
                roleConfigs.filter((r) => r.roleName.trim()).length === 0
              }
            >
              {createPeopleSearch.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Users className="w-4 h-4 mr-2" />
                  Start People Search
                </>
              )}
            </Button>
          </div>

          {createPeopleSearch.isSuccess && (
            <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-700">
              People search created! {createPeopleSearch.data.message}
            </div>
          )}

          {createPeopleSearch.isError && (
            <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
              {createPeopleSearch.error.message}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
