"use client";

import { FolderResponse } from "@shared/types/src";
import { useToggleFavorite, useDeleteFolder } from "@/hooks/api/useLists";
import { Folder, Star, MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { toast } from "sonner";
import { useState, useRef, useEffect } from "react";

interface FolderRowProps {
  folder: FolderResponse;
  onClick: () => void;
}

export function FolderRow({ folder, onClick }: FolderRowProps) {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const toggleFavorite = useToggleFavorite();
  const deleteFolder = useDeleteFolder();

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleFavoriteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    toggleFavorite.mutate({
      folderId: folder.id,
      isFavorite: folder.isFavorite ?? false,
    });
  };

  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setDropdownOpen(false);
    if (confirm("Are you sure you want to delete this folder?")) {
      try {
        await deleteFolder.mutateAsync(folder.id);
        toast.success("Folder deleted");
      } catch {
        toast.error("Failed to delete folder");
      }
    }
  };

  const createdDate = new Date(folder.createdAt).toLocaleDateString();
  const lastOpened = folder.lastOpenedAt
    ? new Date(folder.lastOpenedAt).toLocaleDateString()
    : "-";

  return (
    <tr
      className="hover:bg-muted/50 cursor-pointer transition-colors group"
      onClick={onClick}
    >
      <td className="px-4 py-3 w-12">
        {/* Empty checkbox cell for folders */}
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-3">
          <Folder className="w-5 h-5 text-muted-foreground" />
          <div className="min-w-0">
            <span className="font-medium text-sm truncate">{folder.name}</span>
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
              folder.isFavorite
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
          {folder.owner?.name ?? "-"}
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
            <div className="absolute right-0 top-full mt-1 w-56 rounded-md border bg-popover shadow-lg z-50">
              <div className="py-1">
                <button
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-muted transition-colors"
                  onClick={(e) => {
                    e.stopPropagation();
                    setDropdownOpen(false);
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
                  {folder.isFavorite ? "Remove from favorites" : "Add to favorites"}
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
