"use client";

import { useState } from "react";
import Card from "@/components/ui/Card";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import Modal from "@/components/ui/Modal";
import { useApiKeys, useSaveApiKey, useDeleteApiKey } from "@/hooks/api/useEnrich";
import { toast } from "sonner";
import { Key, Eye, EyeOff, Trash2, Loader2, CheckCircle, XCircle } from "lucide-react";
import { EnrichmentVendor } from "@shared/types/src";

const VENDOR_INFO: Record<string, { name: string; description: string; docsUrl?: string }> = {
  prospeo: {
    name: "Prospeo",
    description: "Find professional emails and phone numbers",
    docsUrl: "https://prospeo.io",
  },
  millionverifier: {
    name: "MillionVerifier",
    description: "Email validation and verification",
    docsUrl: "https://millionverifier.com",
  },
  openrouter: {
    name: "OpenRouter",
    description: "AI API for first line generation (uses Gemini 2.5 Flash)",
    docsUrl: "https://openrouter.ai",
  },
  apollo: {
    name: "Apollo",
    description: "B2B database and sales intelligence",
    docsUrl: "https://apollo.io",
  },
  hunter: {
    name: "Hunter",
    description: "Find email addresses in seconds",
    docsUrl: "https://hunter.io",
  },
  clearbit: {
    name: "Clearbit",
    description: "Data enrichment for businesses",
    docsUrl: "https://clearbit.com",
  },
};

export function ApiKeysSettings() {
  const { data: apiKeysData, isLoading } = useApiKeys();
  const saveKeyMutation = useSaveApiKey();
  const deleteKeyMutation = useDeleteApiKey();

  const [editingVendor, setEditingVendor] = useState<string | null>(null);
  const [apiKeyInput, setApiKeyInput] = useState("");
  const [showApiKey, setShowApiKey] = useState(false);
  const [deleteVendor, setDeleteVendor] = useState<string | null>(null);

  const handleSaveKey = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingVendor || !apiKeyInput.trim()) {
      toast.error("Please enter an API key");
      return;
    }

    try {
      await saveKeyMutation.mutateAsync({
        vendor: editingVendor,
        apiKey: apiKeyInput.trim(),
      });
      toast.success(`${VENDOR_INFO[editingVendor].name} API key saved`);
      setEditingVendor(null);
      setApiKeyInput("");
      setShowApiKey(false);
    } catch (error) {
      toast.error("Failed to save API key");
    }
  };

  const handleDeleteKey = async () => {
    if (!deleteVendor) return;

    try {
      await deleteKeyMutation.mutateAsync(deleteVendor);
      toast.success(`${VENDOR_INFO[deleteVendor].name} API key removed`);
      setDeleteVendor(null);
    } catch (error) {
      toast.error("Failed to delete API key");
    }
  };

  const vendors: string[] = ["prospeo", "millionverifier", "openrouter", "apollo", "hunter", "clearbit"];

  return (
    <>
      <Card title="API Keys">
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Configure your API keys to enable enrichment services. Your keys are encrypted and stored securely.
          </p>

          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="space-y-3">
              {vendors.map((vendorId) => {
                const vendor = VENDOR_INFO[vendorId];
                const apiKeyInfo = apiKeysData?.apiKeys?.find((k) => k.vendor === vendorId);
                const isConfigured = apiKeyInfo?.isConfigured ?? false;

                return (
                  <div
                    key={vendorId}
                    className="flex items-center justify-between p-4 border border-border rounded-lg hover:bg-muted/50 transition"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
                        <Key className="w-5 h-5 text-muted-foreground" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-foreground">{vendor.name}</p>
                          {isConfigured ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                              <CheckCircle className="w-3 h-3" />
                              Configured
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                              <XCircle className="w-3 h-3" />
                              Not configured
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground">{vendor.description}</p>
                        {isConfigured && apiKeyInfo?.maskedKey && (
                          <p className="text-xs text-muted-foreground font-mono mt-1">
                            {apiKeyInfo.maskedKey}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setEditingVendor(vendorId);
                          setApiKeyInput("");
                          setShowApiKey(false);
                        }}
                      >
                        {isConfigured ? "Update" : "Configure"}
                      </Button>
                      {isConfigured && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setDeleteVendor(vendorId)}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </Card>

      {/* Edit API Key Modal */}
      <Modal
        isOpen={editingVendor !== null}
        onClose={() => {
          setEditingVendor(null);
          setApiKeyInput("");
          setShowApiKey(false);
        }}
        title={`Configure ${editingVendor ? VENDOR_INFO[editingVendor].name : ""} API Key`}
        subtitle="Enter your API key to enable this enrichment service"
      >
        <form onSubmit={handleSaveKey} className="space-y-4">
          <div className="relative">
            <Input
              label="API Key"
              type={showApiKey ? "text" : "password"}
              value={apiKeyInput}
              onChange={(e) => setApiKeyInput(e.target.value)}
              placeholder="Enter your API key"
              required
            />
            <button
              type="button"
              onClick={() => setShowApiKey(!showApiKey)}
              className="absolute right-3 top-9 text-muted-foreground hover:text-foreground"
            >
              {showApiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          {editingVendor && VENDOR_INFO[editingVendor].docsUrl && (
            <p className="text-sm text-muted-foreground">
              Get your API key from{" "}
              <a
                href={VENDOR_INFO[editingVendor].docsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary underline"
              >
                {VENDOR_INFO[editingVendor].name}
              </a>
            </p>
          )}
          <div className="flex justify-end gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setEditingVendor(null);
                setApiKeyInput("");
                setShowApiKey(false);
              }}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={saveKeyMutation.isPending}>
              {saveKeyMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                "Save API Key"
              )}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={deleteVendor !== null}
        onClose={() => setDeleteVendor(null)}
        title="Delete API Key"
        subtitle="Are you sure you want to remove this API key?"
      >
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            This will remove the {deleteVendor ? VENDOR_INFO[deleteVendor].name : ""} API key. You
            will need to reconfigure it to use this enrichment service again.
          </p>
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setDeleteVendor(null)}>
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
