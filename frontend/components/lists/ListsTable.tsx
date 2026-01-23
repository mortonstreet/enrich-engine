"use client";

import { useRouter } from "next/navigation";
import { ListResponse, FolderResponse } from "@shared/types/src";
import { ListRow } from "./ListRow";
import { FolderRow } from "./FolderRow";
import { Folder, FileText } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { useListSelection } from "@/contexts/ListSelectionContext";

interface ListsTableProps {
  lists: ListResponse[];
  folders: FolderResponse[];
  currentFolderId: string | null;
  onNavigateToFolder: (id: string | null) => void;
}

export function ListsTable({
  lists,
  folders,
  currentFolderId,
  onNavigateToFolder,
}: ListsTableProps) {
  const router = useRouter();
  const { selectedListIds, selectAll, isSelected, toggleSelection } = useListSelection();

  const handleListClick = (id: string) => {
    router.push(`/dashboard/lists/${id}`);
  };

  const listIds = lists.map((l) => l.id);
  const allSelected = listIds.length > 0 && listIds.every((id) => selectedListIds.has(id));
  const someSelected = listIds.some((id) => selectedListIds.has(id));

  const handleSelectAll = () => {
    selectAll(listIds);
  };

  if (folders.length === 0 && lists.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="w-16 h-16 rounded-xl bg-muted flex items-center justify-center mb-4">
          <FileText className="w-8 h-8 text-muted-foreground" />
        </div>
        <h3 className="font-semibold mb-2">No lists yet</h3>
        <p className="text-sm text-muted-foreground max-w-xs">
          Create a new list or folder to get started organizing your leads
        </p>
      </div>
    );
  }

  return (
    <div className="border rounded-lg overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[600px]">
        <thead className="bg-muted/50 border-b">
          <tr>
            <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-4 py-3 w-12">
              <Checkbox
                checked={allSelected}
                onCheckedChange={handleSelectAll}
                aria-label="Select all lists"
                className={someSelected && !allSelected ? "data-[state=checked]:bg-primary/50" : ""}
              />
            </th>
            <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-4 py-3">
              Name
            </th>
            <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-4 py-3 w-12">
              Tags
            </th>
            <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-4 py-3 hidden md:table-cell">
              Created at
            </th>
            <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-4 py-3 hidden lg:table-cell">
              Last opened
            </th>
            <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-4 py-3 hidden sm:table-cell">
              Owner
            </th>
            <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-4 py-3 w-12">
              <span className="sr-only">Actions</span>
            </th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {/* Back navigation if in a folder */}
          {currentFolderId && (
            <tr
              className="hover:bg-muted/50 cursor-pointer transition-colors"
              onClick={() => onNavigateToFolder(null)}
            >
              <td className="px-4 py-3" colSpan={7}>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded bg-muted flex items-center justify-center">
                    <Folder className="w-4 h-4 text-muted-foreground" />
                  </div>
                  <span className="text-sm font-medium text-muted-foreground">
                    .. (Back)
                  </span>
                </div>
              </td>
            </tr>
          )}

          {/* Folders */}
          {folders.map((folder) => (
            <FolderRow
              key={folder.id}
              folder={folder}
              onClick={() => onNavigateToFolder(folder.id)}
            />
          ))}

          {/* Lists */}
          {lists.map((list) => (
            <ListRow
              key={list.id}
              list={list}
              isSelected={isSelected(list.id)}
              onToggleSelection={() => toggleSelection(list.id)}
              onClick={() => handleListClick(list.id)}
            />
          ))}
        </tbody>
      </table>
      </div>
    </div>
  );
}
