"use client";

import { useState } from "react";
import { Page } from "@/components/dashboard/Page";
import { ListsTable } from "@/components/lists/ListsTable";
import { ListsFilterBar } from "@/components/lists/ListsFilterBar";
import { CreateListDialog } from "@/components/lists/CreateListDialog";
import { CreateFolderDialog } from "@/components/lists/CreateFolderDialog";
import { SelectionActionBar } from "@/components/lists/SelectionActionBar";
import { EnrichDialog } from "@/components/lists/EnrichDialog";
import { ListSelectionProvider, useListSelection } from "@/contexts/ListSelectionContext";
import { useLists, useFavorites, useRecents, useDeleteList, downloadListCsv } from "@/hooks/api/useLists";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

type Tab = "all" | "recents" | "favorites";

function ListsPageContent() {
  const [activeTab, setActiveTab] = useState<Tab>("all");
  const [folderId, setFolderId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [ownerId, setOwnerId] = useState<string | undefined>(undefined);
  const [createListOpen, setCreateListOpen] = useState(false);
  const [createFolderOpen, setCreateFolderOpen] = useState(false);
  const [enrichDialogOpen, setEnrichDialogOpen] = useState(false);

  const { selectedListIds, clearSelection } = useListSelection();
  const deleteListMutation = useDeleteList();

  const listsQuery = useLists({
    folderId: activeTab === "all" ? folderId : undefined,
    search: search || undefined,
    ownerId,
  });

  const favoritesQuery = useFavorites();
  const recentsQuery = useRecents();

  const isLoading =
    activeTab === "all"
      ? listsQuery.isLoading
      : activeTab === "favorites"
        ? favoritesQuery.isLoading
        : recentsQuery.isLoading;

  const handleNavigateToFolder = (id: string | null) => {
    setFolderId(id);
  };

  const handleEnrich = () => {
    setEnrichDialogOpen(true);
  };

  const handleExport = () => {
    const ids = Array.from(selectedListIds);
    ids.forEach((id) => downloadListCsv(id));
    toast.success(`Exporting ${ids.length} list${ids.length !== 1 ? "s" : ""}`);
  };

  const handleDelete = async () => {
    const ids = Array.from(selectedListIds);
    if (!confirm(`Are you sure you want to delete ${ids.length} list${ids.length !== 1 ? "s" : ""}?`)) {
      return;
    }

    try {
      for (const id of ids) {
        await deleteListMutation.mutateAsync(id);
      }
      toast.success(`Deleted ${ids.length} list${ids.length !== 1 ? "s" : ""}`);
      clearSelection();
    } catch {
      toast.error("Failed to delete some lists");
    }
  };

  return (
    <Page title="Lists" subtitle="Organize and manage your leads">
      {/* Tab Navigation */}
      <div className="border-b mb-4 sm:mb-6 -mx-4 sm:mx-0 px-4 sm:px-0">
        <nav className="-mb-px flex space-x-4 sm:space-x-8 overflow-x-auto scrollbar-hide">
          {[
            { id: "all" as Tab, label: "All files" },
            { id: "recents" as Tab, label: "Recents" },
            { id: "favorites" as Tab, label: "Favorites" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id);
                setFolderId(null);
              }}
              className={`py-3 sm:py-4 px-1 border-b-2 font-medium text-sm transition-colors whitespace-nowrap flex-shrink-0 ${
                activeTab === tab.id
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground hover:border-border"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Filter Bar */}
      <ListsFilterBar
        search={search}
        onSearchChange={setSearch}
        ownerId={ownerId}
        onOwnerChange={setOwnerId}
        onCreateList={() => setCreateListOpen(true)}
        onCreateFolder={() => setCreateFolderOpen(true)}
      />

      {/* Content */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      ) : activeTab === "all" ? (
        <ListsTable
          lists={listsQuery.data?.lists ?? []}
          folders={listsQuery.data?.folders ?? []}
          currentFolderId={folderId}
          onNavigateToFolder={handleNavigateToFolder}
        />
      ) : activeTab === "favorites" ? (
        <ListsTable
          lists={
            favoritesQuery.data?.favorites
              ?.filter((f) => f.type === "list")
              .map((f) => f.item as any) ?? []
          }
          folders={
            favoritesQuery.data?.favorites
              ?.filter((f) => f.type === "folder")
              .map((f) => f.item as any) ?? []
          }
          currentFolderId={null}
          onNavigateToFolder={handleNavigateToFolder}
        />
      ) : (
        <ListsTable
          lists={
            recentsQuery.data?.recents
              ?.filter((r) => r.type === "list")
              .map((r) => r.item as any) ?? []
          }
          folders={
            recentsQuery.data?.recents
              ?.filter((r) => r.type === "folder")
              .map((r) => r.item as any) ?? []
          }
          currentFolderId={null}
          onNavigateToFolder={handleNavigateToFolder}
        />
      )}

      {/* Dialogs */}
      <CreateListDialog
        open={createListOpen}
        onOpenChange={setCreateListOpen}
        folderId={folderId ?? undefined}
      />
      <CreateFolderDialog
        open={createFolderOpen}
        onOpenChange={setCreateFolderOpen}
        parentId={folderId ?? undefined}
      />
      <EnrichDialog
        open={enrichDialogOpen}
        onOpenChange={setEnrichDialogOpen}
      />

      {/* Selection Action Bar */}
      <SelectionActionBar
        onEnrich={handleEnrich}
        onExport={handleExport}
        onDelete={handleDelete}
      />
    </Page>
  );
}

export default function ListsPage() {
  return (
    <ListSelectionProvider>
      <ListsPageContent />
    </ListSelectionProvider>
  );
}
