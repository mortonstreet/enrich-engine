"use client";

import { useState } from "react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardAction,
  CardContent,
} from "@/components/ui/Card";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import Modal from "@/components/ui/Modal";
import {
  useExternalApiKeys,
  useCreateExternalApiKey,
  useDeleteExternalApiKey,
  useUpdateExternalApiKey,
} from "@/hooks/api/useExternalApiKeys";
import { toast } from "sonner";
import {
  Key,
  Copy,
  Trash2,
  Loader2,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Plus,
  Clock,
} from "lucide-react";
import { ExternalApiScope, EXTERNAL_API_SCOPES } from "@shared/types/src";

const SCOPE_INFO: Record<
  ExternalApiScope,
  { name: string; description: string }
> = {
  "lists:read": {
    name: "Read Lists",
    description: "View all lists and their leads",
  },
  "lists:write": {
    name: "Write Lists",
    description: "Create, update, and delete lists",
  },
  "leads:read": {
    name: "Read Leads",
    description: "View lead data",
  },
  "leads:write": {
    name: "Write Leads",
    description: "Create, update, and delete leads",
  },
};

export function ExternalApiKeysSettings() {
  const { data: apiKeysData, isLoading } = useExternalApiKeys();
  const createKeyMutation = useCreateExternalApiKey();
  const deleteKeyMutation = useDeleteExternalApiKey();
  const updateKeyMutation = useUpdateExternalApiKey();

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [keyName, setKeyName] = useState("");
  const [selectedScopes, setSelectedScopes] = useState<ExternalApiScope[]>([
    "lists:read",
  ]);
  const [expiresAt, setExpiresAt] = useState("");

  const [showNewKeyModal, setShowNewKeyModal] = useState(false);
  const [newFullKey, setNewFullKey] = useState("");

  const [deleteKeyId, setDeleteKeyId] = useState<string | null>(null);
  const [keyToDelete, setKeyToDelete] = useState<string | null>(null);

  const handleCreateKey = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!keyName.trim()) {
      toast.error("Please enter a name for the API key");
      return;
    }

    if (selectedScopes.length === 0) {
      toast.error("Please select at least one scope");
      return;
    }

    try {
      const result = await createKeyMutation.mutateAsync({
        name: keyName.trim(),
        scopes: selectedScopes,
        expiresAt: expiresAt || null,
      });

      setNewFullKey(result.fullKey);
      setShowCreateModal(false);
      setShowNewKeyModal(true);
      setKeyName("");
      setSelectedScopes(["lists:read"]);
      setExpiresAt("");

      toast.success("API key created successfully");
    } catch (error) {
      toast.error("Failed to create API key");
    }
  };

  const handleCopyKey = async () => {
    try {
      await navigator.clipboard.writeText(newFullKey);
      toast.success("API key copied to clipboard");
    } catch (error) {
      toast.error("Failed to copy API key");
    }
  };

  const handleDeleteKey = async () => {
    if (!deleteKeyId) return;

    try {
      await deleteKeyMutation.mutateAsync(deleteKeyId);
      toast.success("API key deleted");
      setDeleteKeyId(null);
      setKeyToDelete(null);
    } catch (error) {
      toast.error("Failed to delete API key");
    }
  };

  const toggleScope = (scope: ExternalApiScope) => {
    setSelectedScopes((prev) =>
      prev.includes(scope) ? prev.filter((s) => s !== scope) : [...prev, scope]
    );
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "Never";
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const isExpired = (expiresAt: string | null) => {
    if (!expiresAt) return false;
    return new Date(expiresAt) < new Date();
  };

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="text-xl">External API Keys</CardTitle>
          <CardAction>
            <Button size="sm" onClick={() => setShowCreateModal(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Create API Key
            </Button>
          </CardAction>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Create API keys to allow external applications (like GTM Dialer) to
              access your EnrichEngine data. Keys are shown only once when
              created.
            </p>

            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            ) : apiKeysData?.apiKeys && apiKeysData.apiKeys.length > 0 ? (
              <div className="space-y-3">
                {apiKeysData.apiKeys.map((apiKey) => {
                  const expired = isExpired(apiKey.expiresAt);

                  return (
                    <div
                      key={apiKey.id}
                      className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 sm:p-4 border border-border rounded-lg hover:bg-muted/50 transition"
                    >
                      <div className="flex items-start sm:items-center gap-3 min-w-0">
                        <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
                          <Key className="w-4 h-4 sm:w-5 sm:h-5 text-muted-foreground" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="font-medium text-foreground text-sm sm:text-base truncate">
                              {apiKey.name}
                            </p>
                            {expired ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                                <XCircle className="w-3 h-3" />
                                Expired
                              </span>
                            ) : apiKey.isActive ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                <CheckCircle className="w-3 h-3" />
                                Active
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                                <XCircle className="w-3 h-3" />
                                Inactive
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground font-mono mt-1">
                            {apiKey.keyPrefix}...
                          </p>
                          <div className="flex flex-wrap items-center gap-2 sm:gap-4 mt-1 text-xs text-muted-foreground">
                            <span className="hidden sm:inline">
                              Scopes:{" "}
                              {apiKey.scopes
                                .map((s) => SCOPE_INFO[s]?.name || s)
                                .join(", ")}
                            </span>
                            {apiKey.lastUsedAt && (
                              <span className="flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                <span className="hidden sm:inline">Last used:</span> {formatDate(apiKey.lastUsedAt)}
                              </span>
                            )}
                            {apiKey.expiresAt && (
                              <span><span className="hidden sm:inline">Expires:</span> {formatDate(apiKey.expiresAt)}</span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 self-end sm:self-auto">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            setDeleteKeyId(apiKey.id);
                            setKeyToDelete(apiKey.name);
                          }}
                          className="text-destructive hover:text-destructive h-8 w-8 sm:h-10 sm:w-10"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Key className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>No API keys created yet</p>
                <p className="text-sm mt-1">
                  Create an API key to allow external apps to access your data
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Create API Key Modal */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => {
          setShowCreateModal(false);
          setKeyName("");
          setSelectedScopes(["lists:read"]);
          setExpiresAt("");
        }}
        title="Create API Key"
        subtitle="Create a new API key for external integrations"
      >
        <form onSubmit={handleCreateKey} className="space-y-4">
          <Input
            label="Name"
            value={keyName}
            onChange={(e) => setKeyName(e.target.value)}
            placeholder="e.g., GTM Dialer Integration"
            required
          />

          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Permissions
            </label>
            <div className="space-y-2">
              {EXTERNAL_API_SCOPES.map((scope) => (
                <label
                  key={scope}
                  className="flex items-start gap-3 p-3 border border-border rounded-lg cursor-pointer hover:bg-muted/50 transition"
                >
                  <input
                    type="checkbox"
                    checked={selectedScopes.includes(scope)}
                    onChange={() => toggleScope(scope)}
                    className="mt-0.5"
                  />
                  <div>
                    <p className="font-medium text-sm">{SCOPE_INFO[scope].name}</p>
                    <p className="text-xs text-muted-foreground">
                      {SCOPE_INFO[scope].description}
                    </p>
                  </div>
                </label>
              ))}
            </div>
          </div>

          <Input
            label="Expiration Date (Optional)"
            type="datetime-local"
            value={expiresAt}
            onChange={(e) => setExpiresAt(e.target.value)}
          />

          <div className="flex justify-end gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setShowCreateModal(false);
                setKeyName("");
                setSelectedScopes(["lists:read"]);
                setExpiresAt("");
              }}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={createKeyMutation.isPending}>
              {createKeyMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                "Create API Key"
              )}
            </Button>
          </div>
        </form>
      </Modal>

      {/* New Key Created Modal */}
      <Modal
        isOpen={showNewKeyModal}
        onClose={() => {
          setShowNewKeyModal(false);
          setNewFullKey("");
        }}
        title="API Key Created"
        subtitle="Make sure to copy your API key now"
      >
        <div className="space-y-4">
          <div className="flex items-start gap-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-yellow-800">
            <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <p className="text-sm">
              This is the only time you will see this API key. Please copy it
              and store it securely.
            </p>
          </div>

          <div className="relative">
            <div className="p-3 bg-muted rounded-lg font-mono text-sm break-all">
              {newFullKey}
            </div>
            <Button
              size="sm"
              variant="outline"
              className="absolute top-2 right-2"
              onClick={handleCopyKey}
            >
              <Copy className="w-4 h-4 mr-1" />
              Copy
            </Button>
          </div>

          <div className="bg-muted/50 p-3 rounded-lg">
            <p className="text-sm font-medium mb-2">Usage Example:</p>
            <code className="text-xs block bg-background p-2 rounded border">
              curl -H "X-API-Key: {newFullKey.slice(0, 20)}..." \<br />
              &nbsp;&nbsp;https://api.enrichengine.io/api/external/lists
            </code>
          </div>

          <div className="flex justify-end">
            <Button
              onClick={() => {
                setShowNewKeyModal(false);
                setNewFullKey("");
              }}
            >
              Done
            </Button>
          </div>
        </div>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={deleteKeyId !== null}
        onClose={() => {
          setDeleteKeyId(null);
          setKeyToDelete(null);
        }}
        title="Delete API Key"
        subtitle="Are you sure you want to revoke this API key?"
      >
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            This will permanently revoke the API key "{keyToDelete}". Any
            applications using this key will no longer be able to access your
            data.
          </p>
          <div className="flex justify-end gap-3">
            <Button
              variant="outline"
              onClick={() => {
                setDeleteKeyId(null);
                setKeyToDelete(null);
              }}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteKey}
              disabled={deleteKeyMutation.isPending}
            >
              {deleteKeyMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                "Delete API Key"
              )}
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}
