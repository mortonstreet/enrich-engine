"use client";

import { createContext, useContext, useState, useCallback, ReactNode } from "react";

interface ListSelectionContextType {
  selectedListIds: Set<string>;
  toggleSelection: (listId: string) => void;
  selectAll: (listIds: string[]) => void;
  clearSelection: () => void;
  isSelected: (listId: string) => boolean;
}

const ListSelectionContext = createContext<ListSelectionContextType | undefined>(undefined);

export function ListSelectionProvider({ children }: { children: ReactNode }) {
  const [selectedListIds, setSelectedListIds] = useState<Set<string>>(new Set());

  const toggleSelection = useCallback((listId: string) => {
    setSelectedListIds((prev) => {
      const next = new Set(prev);
      if (next.has(listId)) {
        next.delete(listId);
      } else {
        next.add(listId);
      }
      return next;
    });
  }, []);

  const selectAll = useCallback((listIds: string[]) => {
    setSelectedListIds((prev) => {
      const allSelected = listIds.every((id) => prev.has(id));
      if (allSelected) {
        // If all are selected, deselect all
        const next = new Set(prev);
        listIds.forEach((id) => next.delete(id));
        return next;
      } else {
        // Otherwise, select all
        const next = new Set(prev);
        listIds.forEach((id) => next.add(id));
        return next;
      }
    });
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedListIds(new Set());
  }, []);

  const isSelected = useCallback(
    (listId: string) => selectedListIds.has(listId),
    [selectedListIds]
  );

  return (
    <ListSelectionContext.Provider
      value={{
        selectedListIds,
        toggleSelection,
        selectAll,
        clearSelection,
        isSelected,
      }}
    >
      {children}
    </ListSelectionContext.Provider>
  );
}

export function useListSelection() {
  const context = useContext(ListSelectionContext);
  if (!context) {
    throw new Error("useListSelection must be used within a ListSelectionProvider");
  }
  return context;
}
