"use client";

import { useState } from "react";
import { useCreateList } from "@/hooks/api/useLists";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/base-input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

interface CreateListDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  folderId?: string;
}

export function CreateListDialog({
  open,
  onOpenChange,
  folderId,
}: CreateListDialogProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const createList = useCreateList();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      toast.error("Please enter a list name");
      return;
    }

    try {
      await createList.mutateAsync({
        name: name.trim(),
        description: description.trim() || undefined,
        folderId,
      });
      toast.success("List created");
      setName("");
      setDescription("");
      onOpenChange(false);
    } catch {
      toast.error("Failed to create list");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create New List</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label htmlFor="list-name" className="text-sm font-medium">
                Name
              </label>
              <Input
                id="list-name"
                placeholder="My Lead List"
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={createList.isPending}
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="list-description" className="text-sm font-medium">
                Description (optional)
              </label>
              <Input
                id="list-description"
                placeholder="A brief description of this list"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                disabled={createList.isPending}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={createList.isPending}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={createList.isPending || !name.trim()}>
              {createList.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                "Create List"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
