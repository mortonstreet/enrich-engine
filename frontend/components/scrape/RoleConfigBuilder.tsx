"use client";

import { useState } from "react";
import { RoleConfig } from "@shared/types/src";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/base-input";
import { Plus, Minus, Trash2, GripVertical } from "lucide-react";

interface RoleConfigBuilderProps {
  roleConfigs: RoleConfig[];
  onChange: (configs: RoleConfig[]) => void;
  maxRoles?: number;
  maxCountPerRole?: number;
}

const commonRoles = [
  "CEO",
  "CTO",
  "CFO",
  "COO",
  "Founder",
  "Co-Founder",
  "VP Sales",
  "VP Marketing",
  "VP Engineering",
  "Head of Sales",
  "Head of Marketing",
  "Head of Product",
  "Sales Director",
  "Marketing Director",
  "Engineering Manager",
];

export function RoleConfigBuilder({
  roleConfigs,
  onChange,
  maxRoles = 10,
  maxCountPerRole = 10,
}: RoleConfigBuilderProps) {
  const [showSuggestions, setShowSuggestions] = useState<number | null>(null);

  const addRole = () => {
    if (roleConfigs.length >= maxRoles) return;
    onChange([...roleConfigs, { roleName: "", count: 1 }]);
  };

  const removeRole = (index: number) => {
    onChange(roleConfigs.filter((_, i) => i !== index));
  };

  const updateRoleName = (index: number, roleName: string) => {
    const updated = [...roleConfigs];
    updated[index] = { ...updated[index], roleName };
    onChange(updated);
    setShowSuggestions(null);
  };

  const updateCount = (index: number, delta: number) => {
    const updated = [...roleConfigs];
    const newCount = Math.max(1, Math.min(maxCountPerRole, updated[index].count + delta));
    updated[index] = { ...updated[index], count: newCount };
    onChange(updated);
  };

  const setCount = (index: number, count: number) => {
    const updated = [...roleConfigs];
    updated[index] = { ...updated[index], count: Math.max(1, Math.min(maxCountPerRole, count)) };
    onChange(updated);
  };

  const totalItems = roleConfigs.reduce((sum, config) => sum + config.count, 0);

  const filteredSuggestions = (index: number) => {
    const current = roleConfigs[index].roleName.toLowerCase();
    const usedRoles = roleConfigs.map((c) => c.roleName.toLowerCase());
    return commonRoles.filter(
      (role) =>
        role.toLowerCase().includes(current) &&
        !usedRoles.includes(role.toLowerCase())
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium">Roles to Find</label>
        {roleConfigs.length < maxRoles && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={addRole}
            className="h-8"
          >
            <Plus className="w-4 h-4 mr-1" />
            Add Role
          </Button>
        )}
      </div>

      {roleConfigs.length === 0 ? (
        <div className="border rounded-lg p-6 text-center">
          <p className="text-sm text-muted-foreground mb-3">
            No roles configured yet. Add roles to search for specific people at each company.
          </p>
          <Button variant="outline" size="sm" onClick={addRole}>
            <Plus className="w-4 h-4 mr-1" />
            Add Your First Role
          </Button>
        </div>
      ) : (
        <div className="space-y-2">
          {roleConfigs.map((config, index) => (
            <div
              key={index}
              className="flex items-center gap-2 p-3 border rounded-lg bg-muted/30"
            >
              <GripVertical className="w-4 h-4 text-muted-foreground cursor-grab" />

              <div className="flex-1 relative">
                <Input
                  value={config.roleName}
                  onChange={(e) => {
                    updateRoleName(index, e.target.value);
                    setShowSuggestions(index);
                  }}
                  onFocus={() => setShowSuggestions(index)}
                  onBlur={() => setTimeout(() => setShowSuggestions(null), 200)}
                  placeholder="e.g., CEO, Founder, VP Sales"
                  className="h-9"
                />
                {showSuggestions === index && config.roleName.length > 0 && (
                  <div className="absolute z-10 top-full left-0 right-0 mt-1 bg-popover border rounded-md shadow-md max-h-40 overflow-y-auto">
                    {filteredSuggestions(index).slice(0, 5).map((suggestion) => (
                      <button
                        key={suggestion}
                        type="button"
                        className="w-full text-left px-3 py-2 text-sm hover:bg-muted"
                        onMouseDown={(e) => {
                          e.preventDefault();
                          updateRoleName(index, suggestion);
                        }}
                      >
                        {suggestion}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex items-center gap-1">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-9 w-9 p-0"
                  onClick={() => updateCount(index, -1)}
                  disabled={config.count <= 1}
                >
                  <Minus className="w-4 h-4" />
                </Button>
                <Input
                  type="number"
                  value={config.count}
                  onChange={(e) => setCount(index, parseInt(e.target.value) || 1)}
                  className="h-9 w-14 text-center"
                  min={1}
                  max={maxCountPerRole}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-9 w-9 p-0"
                  onClick={() => updateCount(index, 1)}
                  disabled={config.count >= maxCountPerRole}
                >
                  <Plus className="w-4 h-4" />
                </Button>
              </div>

              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-9 w-9 p-0 text-muted-foreground hover:text-destructive"
                onClick={() => removeRole(index)}
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          ))}
        </div>
      )}

      {roleConfigs.length > 0 && (
        <div className="text-sm text-muted-foreground bg-muted/50 rounded-lg p-3">
          <span className="font-medium">{roleConfigs.length}</span> role{roleConfigs.length !== 1 ? "s" : ""} configured,{" "}
          <span className="font-medium">{totalItems}</span> total person{totalItems !== 1 ? "s" : ""} per company
        </div>
      )}
    </div>
  );
}
