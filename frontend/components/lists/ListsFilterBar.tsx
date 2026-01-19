"use client";

import { Search, Plus, FolderPlus } from "lucide-react";
import { Input } from "@/components/ui/base-input";
import { Button } from "@/components/ui/Button";

interface ListsFilterBarProps {
  search: string;
  onSearchChange: (value: string) => void;
  ownerId?: string;
  onOwnerChange: (value: string | undefined) => void;
  onCreateList: () => void;
  onCreateFolder: () => void;
}

export function ListsFilterBar({
  search,
  onSearchChange,
  onCreateList,
  onCreateFolder,
}: ListsFilterBarProps) {
  return (
    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
      <div className="flex items-center gap-4 w-full sm:w-auto">
        <div className="relative flex-1 sm:w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search lists and folders..."
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      <div className="flex items-center gap-2 w-full sm:w-auto">
        <Button variant="outline" size="sm" onClick={onCreateFolder}>
          <FolderPlus className="w-4 h-4 mr-2" />
          New Folder
        </Button>
        <Button size="sm" onClick={onCreateList}>
          <Plus className="w-4 h-4 mr-2" />
          New List
        </Button>
      </div>
    </div>
  );
}
