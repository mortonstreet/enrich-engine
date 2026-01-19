"use client";

import { useState } from "react";
import { LeadResponse } from "@shared/types/src";
import { useUpdateLead } from "@/hooks/api/useLists";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/base-input";
import { Check, X, Pencil, Users, ExternalLink } from "lucide-react";
import { toast } from "sonner";

interface LeadsTableProps {
  leads: LeadResponse[];
  listId: string;
}

export function LeadsTable({ leads, listId }: LeadsTableProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editData, setEditData] = useState<Partial<LeadResponse>>({});
  const updateLead = useUpdateLead();

  const startEditing = (lead: LeadResponse) => {
    setEditingId(lead.id);
    setEditData({
      firstName: lead.firstName,
      lastName: lead.lastName,
      email: lead.email,
      phone: lead.phone,
      company: lead.company,
      role: lead.role,
      linkedinUrl: lead.linkedinUrl,
    });
  };

  const cancelEditing = () => {
    setEditingId(null);
    setEditData({});
  };

  const saveEditing = async () => {
    if (!editingId) return;

    try {
      await updateLead.mutateAsync({
        id: editingId,
        listId,
        ...editData,
      });
      toast.success("Lead updated");
      setEditingId(null);
      setEditData({});
    } catch {
      toast.error("Failed to update lead");
    }
  };

  if (leads.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center border rounded-lg">
        <div className="w-16 h-16 rounded-xl bg-muted flex items-center justify-center mb-4">
          <Users className="w-8 h-8 text-muted-foreground" />
        </div>
        <h3 className="font-semibold mb-2">No leads yet</h3>
        <p className="text-sm text-muted-foreground max-w-xs">
          Upload a CSV file to add leads to this list
        </p>
      </div>
    );
  }

  return (
    <div className="border rounded-lg overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-muted/50 border-b">
            <tr>
              <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-4 py-3">
                Name
              </th>
              <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-4 py-3">
                Email
              </th>
              <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-4 py-3 hidden md:table-cell">
                Phone
              </th>
              <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-4 py-3 hidden lg:table-cell">
                Company
              </th>
              <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-4 py-3 hidden xl:table-cell">
                Role
              </th>
              <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-4 py-3 w-12">
                <span className="sr-only">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {leads.map((lead) => (
              <tr
                key={lead.id}
                className="hover:bg-muted/50 transition-colors"
              >
                {editingId === lead.id ? (
                  <>
                    <td className="px-4 py-3">
                      <div className="flex gap-1">
                        <Input
                          value={editData.firstName ?? ""}
                          onChange={(e) =>
                            setEditData({ ...editData, firstName: e.target.value })
                          }
                          placeholder="First"
                          className="h-8 text-sm w-24"
                        />
                        <Input
                          value={editData.lastName ?? ""}
                          onChange={(e) =>
                            setEditData({ ...editData, lastName: e.target.value })
                          }
                          placeholder="Last"
                          className="h-8 text-sm w-24"
                        />
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <Input
                        value={editData.email ?? ""}
                        onChange={(e) =>
                          setEditData({ ...editData, email: e.target.value })
                        }
                        placeholder="Email"
                        className="h-8 text-sm"
                      />
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      <Input
                        value={editData.phone ?? ""}
                        onChange={(e) =>
                          setEditData({ ...editData, phone: e.target.value })
                        }
                        placeholder="Phone"
                        className="h-8 text-sm"
                      />
                    </td>
                    <td className="px-4 py-3 hidden lg:table-cell">
                      <Input
                        value={editData.company ?? ""}
                        onChange={(e) =>
                          setEditData({ ...editData, company: e.target.value })
                        }
                        placeholder="Company"
                        className="h-8 text-sm"
                      />
                    </td>
                    <td className="px-4 py-3 hidden xl:table-cell">
                      <Input
                        value={editData.role ?? ""}
                        onChange={(e) =>
                          setEditData({ ...editData, role: e.target.value })
                        }
                        placeholder="Role"
                        className="h-8 text-sm"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0 text-green-600"
                          onClick={saveEditing}
                          disabled={updateLead.isPending}
                        >
                          <Check className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0 text-muted-foreground"
                          onClick={cancelEditing}
                          disabled={updateLead.isPending}
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    </td>
                  </>
                ) : (
                  <>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">
                          {[lead.firstName, lead.lastName]
                            .filter(Boolean)
                            .join(" ") || "-"}
                        </span>
                        {lead.linkedinUrl && (
                          <a
                            href={lead.linkedinUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-muted-foreground hover:text-foreground"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-sm text-muted-foreground">
                        {lead.email || "-"}
                      </span>
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      <span className="text-sm text-muted-foreground">
                        {lead.phone || "-"}
                      </span>
                    </td>
                    <td className="px-4 py-3 hidden lg:table-cell">
                      <span className="text-sm text-muted-foreground">
                        {lead.company || "-"}
                      </span>
                    </td>
                    <td className="px-4 py-3 hidden xl:table-cell">
                      <span className="text-sm text-muted-foreground">
                        {lead.role || "-"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0"
                        onClick={() => startEditing(lead)}
                      >
                        <Pencil className="w-4 h-4" />
                      </Button>
                    </td>
                  </>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
