"use client";

import { useState, useRef, useEffect } from "react";
import { Search, Plus, FileText, Folder } from "lucide-react";
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
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

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

      <div className="relative" ref={dropdownRef}>
        <Button size="sm" onClick={() => setDropdownOpen(!dropdownOpen)}>
          <Plus className="w-4 h-4 mr-2" />
          New
        </Button>
        {dropdownOpen && (
          <div className="absolute right-0 top-full mt-1 w-36 rounded-md border bg-popover shadow-lg z-50">
            <div className="py-1">
              <button
                className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-muted transition-colors"
                onClick={() => {
                  setDropdownOpen(false);
                  onCreateList();
                }}
              >
                <FileText className="w-4 h-4" />
                List
              </button>
              <button
                className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-muted transition-colors"
                onClick={() => {
                  setDropdownOpen(false);
                  onCreateFolder();
                }}
              >
                <Folder className="w-4 h-4" />
                Folder
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
