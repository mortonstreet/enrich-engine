"use client";

import { ListResponse, ListImportStatus } from "@shared/types/src";
import { useToggleFavorite, useDeleteList, useUpdateList } from "@/hooks/api/useLists";
import {
  FileText,
  Star,
  MoreHorizontal,
  Pencil,
  Trash2,
  Download,
  FolderInput,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Checkbox } from "@/components/ui/checkbox";
import { downloadListCsv } from "@/hooks/api/useLists";
import { toast } from "sonner";
import { useState, useRef, useEffect } from "react";

interface ListRowProps {
  list: ListResponse;
  isSelected: boolean;
  onToggleSelection: () => void;
  onClick: () => void;
}

const statusConfig: Record<string, { label: string; className: string }> = {
  pending: { label: "Pending", className: "bg-yellow-100 text-yellow-800" },
  processing: { label: "Processing", className: "bg-blue-100 text-blue-800" },
  completed: { label: "Completed", className: "bg-green-100 text-green-800" },
  failed: { label: "Failed", className: "bg-red-100 text-red-800" },
};

export function ListRow({ list, isSelected, onToggleSelection, onClick }: ListRowProps) {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [isRenaming, setIsRenaming] = useState(false);
  const [newName, setNewName] = useState(list.name);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const toggleFavorite = useToggleFavorite();
  const deleteList = useDeleteList();
  const updateList = useUpdateList();

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (isRenaming && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isRenaming]);

  const handleRename = async () => {
    if (!newName.trim() || newName === list.name) {
      setIsRenaming(false);
      setNewName(list.name);
      return;
    }
    try {
      await updateList.mutateAsync({ id: list.id, name: newName.trim() });
      toast.success("List renamed");
      setIsRenaming(false);
    } catch {
      toast.error("Failed to rename list");
      setNewName(list.name);
    }
  };

  const handleRenameKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleRename();
    } else if (e.key === "Escape") {
      setIsRenaming(false);
      setNewName(list.name);
    }
  };

  const handleFavoriteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    toggleFavorite.mutate({
      listId: list.id,
      isFavorite: list.isFavorite ?? false,
    });
  };

  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setDropdownOpen(false);
    if (confirm("Are you sure you want to delete this list?")) {
      try {
        await deleteList.mutateAsync(list.id);
        toast.success("List deleted");
      } catch {
        toast.error("Failed to delete list");
      }
    }
  };

  const handleExport = (e: React.MouseEvent) => {
    e.stopPropagation();
    setDropdownOpen(false);
    downloadListCsv(list.id);
  };

  const status = statusConfig[list.importStatus] ?? statusConfig.completed;
  const createdDate = new Date(list.createdAt).toLocaleDateString();
  const lastOpened = list.lastOpenedAt
    ? new Date(list.lastOpenedAt).toLocaleDateString()
    : "-";

  const handleCheckboxClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onToggleSelection();
  };

  const handleEnrich = (e: React.MouseEvent) => {
    e.stopPropagation();
    setDropdownOpen(false);
    onToggleSelection();
  };

  return (
    <tr
      className={`hover:bg-muted/50 cursor-pointer transition-colors group ${isSelected ? "bg-muted/30" : ""}`}
      onClick={onClick}
    >
      <td className="px-4 py-3 w-12">
        <div onClick={handleCheckboxClick}>
          <Checkbox
            checked={isSelected}
            onCheckedChange={() => onToggleSelection()}
            aria-label={`Select ${list.name}`}
          />
        </div>
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded bg-muted flex items-center justify-center">
            <FileText className="w-4 h-4 text-muted-foreground" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              {isRenaming ? (
                <input
                  ref={inputRef}
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  onBlur={handleRename}
                  onKeyDown={handleRenameKeyDown}
                  onClick={(e) => e.stopPropagation()}
                  className="font-medium text-sm px-1 py-0.5 border rounded bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                />
              ) : (
                <span
                  className="font-medium text-sm truncate cursor-pointer hover:text-primary inline-flex items-center gap-1 group/name"
                  onDoubleClick={(e) => {
                    e.stopPropagation();
                    setIsRenaming(true);
                  }}
                  title="Double-click to rename"
                >
                  {list.name}
                  <Pencil className="w-3 h-3 opacity-0 group-hover/name:opacity-50 transition-opacity" />
                </span>
              )}
              <span
                className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${status.className}`}
              >
                {status.label}
              </span>
            </div>
            {list.description && (
              <p className="text-xs text-muted-foreground truncate mt-0.5">
                {list.description}
              </p>
            )}
            <p className="text-xs text-muted-foreground mt-0.5">
              {list.leadCount} leads
            </p>
          </div>
        </div>
      </td>
      <td className="px-4 py-3">
        <button
          onClick={handleFavoriteClick}
          className="p-1 hover:bg-muted rounded transition-colors"
        >
          <Star
            className={`w-4 h-4 ${
              list.isFavorite
                ? "fill-yellow-400 text-yellow-400"
                : "text-muted-foreground"
            }`}
          />
        </button>
      </td>
      <td className="px-4 py-3 hidden md:table-cell">
        <span className="text-sm text-muted-foreground">{createdDate}</span>
      </td>
      <td className="px-4 py-3 hidden lg:table-cell">
        <span className="text-sm text-muted-foreground">{lastOpened}</span>
      </td>
      <td className="px-4 py-3 hidden sm:table-cell">
        <span className="text-sm text-muted-foreground">
          {list.owner?.name ?? "-"}
        </span>
      </td>
      <td className="px-4 py-3">
        <div className="relative" ref={dropdownRef}>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0"
            onClick={(e) => {
              e.stopPropagation();
              setDropdownOpen(!dropdownOpen);
            }}
          >
            <MoreHorizontal className="w-4 h-4" />
          </Button>
          {dropdownOpen && (
            <div className="absolute right-0 top-full mt-1 w-48 rounded-md border bg-popover shadow-lg z-50">
              <div className="py-1">
                <button
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-muted transition-colors text-primary font-medium"
                  onClick={handleEnrich}
                >
                  <Sparkles className="w-4 h-4" />
                  Enrich
                </button>
                <hr className="my-1" />
                <button
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-muted transition-colors"
                  onClick={(e) => {
                    e.stopPropagation();
                    setDropdownOpen(false);
                    setIsRenaming(true);
                  }}
                >
                  <Pencil className="w-4 h-4" />
                  Rename
                </button>
                <button
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-muted transition-colors"
                  onClick={handleFavoriteClick}
                >
                  <Star className="w-4 h-4" />
                  {list.isFavorite ? "Remove from favorites" : "Add to favorites"}
                </button>
                <button
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-muted transition-colors"
                  onClick={(e) => {
                    e.stopPropagation();
                    setDropdownOpen(false);
                  }}
                >
                  <FolderInput className="w-4 h-4" />
                  Move
                </button>
                <button
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-muted transition-colors"
                  onClick={handleExport}
                >
                  <Download className="w-4 h-4" />
                  Export CSV
                </button>
                <hr className="my-1" />
                <button
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-destructive hover:bg-muted transition-colors"
                  onClick={handleDelete}
                >
                  <Trash2 className="w-4 h-4" />
                  Delete
                </button>
              </div>
            </div>
          )}
        </div>
      </td>
    </tr>
  );
}
