"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/base-input";
import { Label } from "@/components/ui/label";
import { X, FolderPlus, Trash2, Loader2 } from "lucide-react";
import { useCreateListFromLeads, useDeleteLead } from "@/hooks/api/useLists";
import { toast } from "sonner";

interface LeadsBulkActionBarProps {
  selectedCount: number;
  selectedIds: string[];
  onClear: () => void;
  onSuccess?: () => void;
}

export function LeadsBulkActionBar({
  selectedCount,
  selectedIds,
  onClear,
  onSuccess,
}: LeadsBulkActionBarProps) {
  const [isCreateListOpen, setIsCreateListOpen] = useState(false);
  const [listName, setListName] = useState("");
  const createListMutation = useCreateListFromLeads();
  const deleteLeadMutation = useDeleteLead();

  if (selectedCount === 0) return null;

  const handleCreateList = async () => {
    if (!listName.trim()) {
      toast.error("Please enter a list name");
      return;
    }

    try {
      const result = await createListMutation.mutateAsync({
        name: listName.trim(),
        leadIds: selectedIds,
      });
      toast.success(`Created list "${result.list.name}" with ${result.leadsCreated} leads`);
      setIsCreateListOpen(false);
      setListName("");
      onClear();
      onSuccess?.();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to create list");
    }
  };

  const handleDeleteSelected = async () => {
    if (!confirm(`Are you sure you want to delete ${selectedCount} lead${selectedCount !== 1 ? "s" : ""}?`)) {
      return;
    }

    try {
      await Promise.all(selectedIds.map((id) => deleteLeadMutation.mutateAsync(id)));
      toast.success(`Deleted ${selectedCount} lead${selectedCount !== 1 ? "s" : ""}`);
      onClear();
      onSuccess?.();
    } catch {
      toast.error("Failed to delete some leads");
    }
  };

  return (
    <>
      <div className="flex items-center justify-between gap-4 rounded-lg border bg-muted/50 px-4 py-3">
        <span className="text-sm font-medium">
          {selectedCount} lead{selectedCount !== 1 ? "s" : ""} selected
        </span>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsCreateListOpen(true)}
          >
            <FolderPlus className="w-4 h-4 mr-2" />
            Create List
          </Button>
          <Button
            variant="destructive"
            size="sm"
            onClick={handleDeleteSelected}
            disabled={deleteLeadMutation.isPending}
          >
            {deleteLeadMutation.isPending ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Trash2 className="w-4 h-4 mr-2" />
            )}
            Delete
          </Button>
          <Button variant="ghost" size="sm" onClick={onClear}>
            <X className="h-4 w-4 mr-1" />
            Clear
          </Button>
        </div>
      </div>

      <Dialog open={isCreateListOpen} onOpenChange={setIsCreateListOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create List from Selection</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <p className="text-sm text-muted-foreground">
              Create a new list containing {selectedCount} selected lead{selectedCount !== 1 ? "s" : ""}.
              The leads will be copied to the new list.
            </p>
            <div className="space-y-2">
              <Label htmlFor="listName">List Name</Label>
              <Input
                id="listName"
                value={listName}
                onChange={(e) => setListName(e.target.value)}
                placeholder="e.g., Test Batch - 10 Leads"
                autoFocus
              />
            </div>
            <div className="flex justify-end gap-2 pt-4">
              <Button
                variant="outline"
                onClick={() => {
                  setIsCreateListOpen(false);
                  setListName("");
                }}
              >
                Cancel
              </Button>
              <Button
                onClick={handleCreateList}
                disabled={createListMutation.isPending || !listName.trim()}
              >
                {createListMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Creating...
                  </>
                ) : (
                  "Create List"
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
