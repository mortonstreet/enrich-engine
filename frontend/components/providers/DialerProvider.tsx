"use client";

import { createContext, useContext, useState, useCallback, useRef, useEffect, ReactNode } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Device, Call } from "@twilio/voice-sdk";
import { get, post } from "@/lib/api";
import { QUERY_KEYS, ENDPOINTS } from "@/lib/config";
import { useActiveOrganization } from "@/lib/auth-client";
import { useDialerConfig } from "@/hooks/api/useDialer";
import type { CapabilityTokenResponse } from "@shared/types/src";

type CallState = "idle" | "initiated" | "ringing" | "in-progress" | "completed" | "failed";
type TwilioConnection = Call;

// Persisted dialer selection state (survives tab switches)
interface DialerSelection {
  clientId?: string;
  campaignId?: string;
  listId?: string;
}

// Parallel dialer session state
interface ParallelDialerSession {
  isActive: boolean;
  sessionId?: string;
  conferenceId?: string;
}

// Current lead info for displaying in floating widget
interface CurrentLeadInfo {
  id: string;
  name: string;
  phone: string;
  // Extended fields for mini widget
  firstName?: string | null;
  lastName?: string | null;
  linkedInUrl?: string | null;
  website?: string | null;
  timezone?: string | null;
  campaignId?: string;  // For navigation
  listId?: string;      // For navigation
}

type InitStep = "authenticating" | "connecting" | "registering" | "ready" | null;

interface DialerContextValue {
  device: Device | null;
  connection: TwilioConnection | null;
  callState: CallState;
  currentCallId: string | null;
  incomingCall: TwilioConnection | null;
  isReady: boolean;
  error: string | null;
  isInitializing: boolean;
  initStep: InitStep;
  isInConference: boolean;
  initializeDevice: () => Promise<boolean>;
  makeCall: (toNumber: string, leadId?: string, campaignId?: string, fromNumber?: string) => Promise<void>;
  answerIncomingCall: () => void;
  rejectIncomingCall: () => void;
  endCall: () => Promise<void>;
  toggleMute: () => void;
  joinConference: (conferenceId: string) => Promise<void>;
  leaveConference: () => void;
  setConnection: (conn: TwilioConnection | null) => void;
  setCallState: (state: CallState) => void;
  setCurrentCallId: (id: string | null) => void;
  setError: (error: string | null) => void;
  // Persisted selection state
  dialerSelection: DialerSelection;
  setDialerSelection: (selection: DialerSelection) => void;
  // Parallel dialer session state
  parallelSession: ParallelDialerSession;
  setParallelSession: (session: ParallelDialerSession | ((prev: ParallelDialerSession) => ParallelDialerSession)) => void;
  // Current lead info (for floating widget display)
  currentLeadInfo: CurrentLeadInfo | null;
  setCurrentLeadInfo: (info: CurrentLeadInfo | null) => void;
  // Widget minimized state (persisted to sessionStorage)
  isWidgetMinimized: boolean;
  setIsWidgetMinimized: (minimized: boolean) => void;
}

const DialerContext = createContext<DialerContextValue | null>(null);

const TOKEN_CACHE_KEY = "omnidial-token";
const TOKEN_TTL_MS = 50 * 60 * 1000; // 50 minutes

interface CachedToken {
  token: string;
  expiresAt: number;
}

function getCachedToken(): string | null {
  try {
    const raw = localStorage.getItem(TOKEN_CACHE_KEY);
    if (!raw) return null;
    const cached: CachedToken = JSON.parse(raw);
    if (Date.now() >= cached.expiresAt) {
      localStorage.removeItem(TOKEN_CACHE_KEY);
      return null;
    }
    return cached.token;
  } catch {
    return null;
  }
}

function setCachedToken(token: string) {
  try {
    const data: CachedToken = { token, expiresAt: Date.now() + TOKEN_TTL_MS };
    localStorage.setItem(TOKEN_CACHE_KEY, JSON.stringify(data));
  } catch {
    // localStorage may be unavailable
  }
}

function clearCachedToken() {
  try {
    localStorage.removeItem(TOKEN_CACHE_KEY);
  } catch {
    // noop
  }
}

export function useDialerContext() {
  const context = useContext(DialerContext);
  if (!context) {
    throw new Error("useDialerContext must be used within a DialerProvider");
  }
  return context;
}

export function DialerProvider({ children }: { children: ReactNode }) {
  const [device, setDevice] = useState<Device | null>(null);
  const [connection, setConnection] = useState<TwilioConnection | null>(null);
  const [callState, setCallState] = useState<CallState>("idle");
  const [currentCallId, setCurrentCallId] = useState<string | null>(null);
  const [incomingCall, setIncomingCall] = useState<TwilioConnection | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isInitializing, setIsInitializing] = useState(false);
  const [initStep, setInitStep] = useState<InitStep>(null);
  const [isInConference, setIsInConference] = useState(false);

  // Persisted selection state (survives tab switches within dialer)
  const [dialerSelection, setDialerSelection] = useState<DialerSelection>({});

  // Parallel dialer session state
  const [parallelSession, setParallelSession] = useState<ParallelDialerSession>({
    isActive: false,
  });

  // Current lead info for floating widget display
  const [currentLeadInfo, setCurrentLeadInfo] = useState<CurrentLeadInfo | null>(null);

  // Widget minimized state - persisted to sessionStorage
  const WIDGET_MINIMIZED_KEY = "floating-dialer-minimized";
  const [isWidgetMinimized, setIsWidgetMinimizedState] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    try {
      return sessionStorage.getItem(WIDGET_MINIMIZED_KEY) === "true";
    } catch {
      return false;
    }
  });

  const setIsWidgetMinimized = useCallback((minimized: boolean) => {
    setIsWidgetMinimizedState(minimized);
    try {
      sessionStorage.setItem(WIDGET_MINIMIZED_KEY, String(minimized));
    } catch {
      // Ignore storage errors
    }
  }, []);

  const deviceRef = useRef<Device | null>(null);
  const queryClient = useQueryClient();

  const activeOrganization = useActiveOrganization();
  const organizationId = activeOrganization?.data?.id;

  // Keep a ref so closures always read the latest organizationId
  const organizationIdRef = useRef(organizationId);
  organizationIdRef.current = organizationId;

  // Check if dialer is configured
  const { data: dialerConfig } = useDialerConfig(organizationId);

  // Fetch capability token
  const { refetch: refetchToken } = useQuery({
    queryKey: QUERY_KEYS.dialerToken(),
    queryFn: async () => {
      const response = await get<{ data: CapabilityTokenResponse }>(ENDPOINTS.DIALER.TOKEN);
      return response.data;
    },
    enabled: false,
    staleTime: 1000 * 60 * 50,
  });

  // Track initialization attempts to prevent race conditions
  const initializationPromiseRef = useRef<Promise<boolean> | null>(null);

  // Single attempt to initialize device with a given token
  const attemptInit = useCallback(async (token: string): Promise<boolean> => {
    // Clean up existing device
    if (deviceRef.current) {
      deviceRef.current.destroy();
    }

    setInitStep("connecting");
    const newDevice = new Device(token);

    // Create a promise that resolves when registered
    setInitStep("registering");
    const registeredPromise = new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => {
        console.error("[Dialer] Device registration timeout after 10s");
        console.error("[Dialer] This usually means Twilio credentials are invalid or missing.");
        console.error("[Dialer] Check: TWILIO_API_KEY_SID, TWILIO_API_KEY_SECRET, TWILIO_TWIML_APP_SID");
        console.error("[Dialer] Organization ID:", organizationIdRef.current ?? "none");
        reject(new Error("Device registration timeout — check Twilio configuration (API keys, TwiML App SID)"));
      }, 10000);

      newDevice.on("registered", () => {
        clearTimeout(timeout);
        setIsReady(true);
        setInitStep("ready");
        console.log("[Dialer] Twilio device registered successfully");
        resolve();
      });

      newDevice.on("error", (err) => {
        clearTimeout(timeout);
        const twilioErr = err as { code?: number; message?: string };
        console.error("[Dialer] Twilio device error:", twilioErr.code ?? "no code", twilioErr.message ?? err);
        console.error("[Dialer] Organization ID:", organizationIdRef.current ?? "none");
        reject(err);
      });
    });

    newDevice.on("unregistered", () => {
      setIsReady(false);
      console.log("Twilio device unregistered");
    });

    newDevice.on("incoming", (conn: TwilioConnection) => {
      console.log("Incoming call detected");
      setIncomingCall(conn);

      conn.on("accept", () => {
        setConnection(conn);
        setCallState("in-progress");
        setIncomingCall(null);
      });

      conn.on("reject", () => {
        setIncomingCall(null);
      });

      conn.on("disconnect", () => {
        setConnection(null);
        setCallState("completed");
        setIncomingCall(null);
        setTimeout(() => {
          setCallState((prev) => prev === "completed" ? "idle" : prev);
          setCurrentCallId(null);
        }, 3000);
      });

      conn.on("cancel", () => {
        setIncomingCall(null);
        setCallState("idle");
      });
    });

    newDevice.on("tokenWillExpire", async () => {
      console.log("Token expiring, refreshing...");
      const { data: newData } = await refetchToken();
      if (newData?.token) {
        newDevice.updateToken(newData.token);
        setCachedToken(newData.token);
      }
    });

    deviceRef.current = newDevice;
    setDevice(newDevice);

    newDevice.register();
    await registeredPromise;
    return true;
  }, [refetchToken]);

  // Initialize Twilio device with caching + retry
  const initializeDevice = useCallback(async (): Promise<boolean> => {
    // If already ready, return true
    if (isReady) return true;

    // If there's already an initialization in progress, wait for it
    if (initializationPromiseRef.current) {
      return initializationPromiseRef.current;
    }

    // Create the initialization promise
    const initPromise = (async (): Promise<boolean> => {
      if (isInitializing) return false;

      const MAX_RETRIES = 2;

      try {
        setIsInitializing(true);
        setError(null);
        setInitStep("authenticating");

        // Try cached token first
        let token = getCachedToken();

        if (!token) {
          const { data } = await refetchToken();
          if (!data?.token) {
            throw new Error("Failed to get capability token");
          }
          token = data.token;
          setCachedToken(token);
        }

        // Attempt init with retries
        let lastError: Error | null = null;
        for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
          try {
            if (attempt > 0) {
              // On retry, wait 1s then re-fetch a fresh token (cached one may be bad)
              await new Promise((r) => setTimeout(r, 1000));
              clearCachedToken();
              setInitStep("authenticating");
              const { data } = await refetchToken();
              if (!data?.token) {
                throw new Error("Failed to get capability token");
              }
              token = data.token;
              setCachedToken(token);
            }
            await attemptInit(token!);
            return true;
          } catch (err) {
            lastError = err instanceof Error ? err : new Error("Failed to initialize device");
            console.warn(`Twilio init attempt ${attempt + 1} failed:`, lastError.message);
          }
        }

        throw lastError || new Error("Failed to initialize device");
      } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to initialize device";
        setError(message);
        setInitStep(null);
        console.error("Failed to initialize Twilio device:", err);
        return false;
      } finally {
        setIsInitializing(false);
        initializationPromiseRef.current = null;
      }
    })();

    initializationPromiseRef.current = initPromise;
    return initPromise;
  }, [refetchToken, isInitializing, isReady, attemptInit]);

  // Clear cached token on org switch
  const prevOrgRef = useRef<string | undefined>(undefined);
  useEffect(() => {
    if (prevOrgRef.current && organizationId && prevOrgRef.current !== organizationId) {
      clearCachedToken();
    }
    prevOrgRef.current = organizationId;
  }, [organizationId]);

  // Auto-initialize when config is available
  useEffect(() => {
    if (dialerConfig && organizationId && !isReady && !isInitializing && !deviceRef.current) {
      initializeDevice();
    }
  }, [dialerConfig, organizationId, isReady, isInitializing, initializeDevice]);

  // Initiate call mutation
  const initiateCallMutation = useMutation({
    mutationFn: async (params: { toNumber: string; fromNumber: string; leadId?: string; campaignId?: string }) => {
      const response = await post<{ data: { id: string; twilioCallSid: string } }>(
        ENDPOINTS.CALLS.CREATE,
        params
      );
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.calls() });
    },
  });

  // End call mutation
  const endCallMutation = useMutation({
    mutationFn: async (callId: string) => {
      await post(ENDPOINTS.CALLS.END(callId));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.calls() });
    },
  });

  // Make outbound call
  const makeCall = useCallback(
    async (toNumber: string, leadId?: string, campaignId?: string, fromNumber?: string) => {
      const currentDevice = deviceRef.current;
      if (!currentDevice) {
        throw new Error("Device not ready");
      }

      try {
        setCallState("initiated");

        // Create call record in backend
        const callData = await initiateCallMutation.mutateAsync({
          toNumber,
          fromNumber: fromNumber || "",
          leadId,
          campaignId,
        });

        setCurrentCallId(callData.id);

        // Connect via Twilio Device
        const conn = await currentDevice.connect({
          params: {
            To: toNumber,
            From: fromNumber || "",
            callId: callData.id,
          },
        });

        // Attach event handlers
        conn.on("ringing", () => {
          console.log("Call ringing");
          setCallState("ringing");
        });

        conn.on("accept", () => {
          console.log("Call accepted");
          setCallState("in-progress");
        });

        conn.on("disconnect", (call) => {
          console.log("Call disconnected");
          console.log("Disconnect reason:", call?.parameters?.Reason || "unknown");
          setConnection(null);
          setCallState("completed");
          setTimeout(() => {
            setCallState((prev) => prev === "completed" ? "idle" : prev);
            setCurrentCallId(null);
          }, 3000);
        });

        conn.on("cancel", () => {
          console.log("Call was canceled");
          setConnection(null);
          setCallState("completed");
          setTimeout(() => {
            setCallState((prev) => prev === "completed" ? "idle" : prev);
            setCurrentCallId(null);
          }, 1000);
        });

        conn.on("error", (err) => {
          console.error("Call error:", err);
          setError(err.message);
          setCallState("failed");
          setTimeout(() => {
            setCallState((prev) => prev === "failed" ? "idle" : prev);
            setCurrentCallId(null);
            setError(null);
          }, 3000);
        });

        setConnection(conn);
      } catch (err) {
        let message = err instanceof Error ? err.message : "Failed to make call";

        // Check for billing guard errors from the API response
        const errAny = err as Record<string, unknown>;
        const resp = errAny?.response as Record<string, unknown> | undefined;
        const respData = resp?.data as Record<string, unknown> | undefined;
        const apiError = (respData?.error as string) || (errAny?.message as string) || "";
        if (apiError.includes("OVERAGE_CAP_HIT")) {
          message = "Your organization has reached its overage spending cap. Please visit Settings > Billing to raise the cap or upgrade your plan.";
        } else if (apiError.includes("ACCOUNT_SUSPENDED")) {
          message = "Your account has been suspended. Please visit Settings > Billing to resolve payment issues.";
        } else if (apiError.includes("ACCOUNT_CANCELED")) {
          message = "Your subscription has been canceled. Please visit Settings > Billing to reactivate.";
        } else if (apiError.includes("DAILY_LIMIT_REACHED")) {
          message = "You've reached the daily call limit (200 calls). This limit resets at midnight.";
        } else if (apiError.includes("NO_ACTIVE_SUBSCRIPTION")) {
          message = "No active subscription found. Please visit Settings > Billing to choose a plan.";
        } else if (apiError.includes("BILLING_GUARD_UNAVAILABLE")) {
          message = "Billing verification is temporarily unavailable. Please retry in a moment.";
        }

        setError(message);
        setCallState("failed");
        throw err;
      }
    },
    [initiateCallMutation]
  );

  // End call
  const endCall = useCallback(async () => {
    // First notify backend
    if (currentCallId) {
      try {
        await endCallMutation.mutateAsync(currentCallId);
      } catch (error) {
        console.error("Error ending call on backend:", error);
      }
    }
    // Then disconnect browser connection
    if (connection) {
      connection.disconnect();
    }
  }, [connection, currentCallId, endCallMutation]);

  // Answer incoming call
  const answerIncomingCall = useCallback(() => {
    if (incomingCall) {
      incomingCall.accept();
    }
  }, [incomingCall]);

  // Reject incoming call
  const rejectIncomingCall = useCallback(() => {
    if (incomingCall) {
      incomingCall.reject();
    }
  }, [incomingCall]);

  // Toggle mute
  const toggleMute = useCallback(() => {
    if (connection) {
      const isMuted = connection.isMuted();
      connection.mute(!isMuted);
    }
  }, [connection]);

  // Join a parallel dial conference
  const joinConference = useCallback(async (conferenceId: string) => {
    console.log("[DialerProvider] joinConference called with:", conferenceId);
    const currentDevice = deviceRef.current;
    if (!currentDevice) {
      console.error("[DialerProvider] Device not ready - deviceRef.current is null");
      throw new Error("Device not ready");
    }

    try {
      setCallState("initiated");
      setError(null);

      console.log("[DialerProvider] Calling device.connect() with conferenceId:", conferenceId);
      // Connect to the conference via the voice webhook
      // The webhook will join us to the conference room
      const conn = await currentDevice.connect({
        params: {
          conferenceId,
        },
      });
      console.log("[DialerProvider] device.connect() returned, call initiated");

      // Set connection immediately so it can be used for disconnect if needed
      setConnection(conn);

      // Return a promise that resolves when connected or rejects on error
      await new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => {
          console.error("[DialerProvider] Conference connection timeout after 15s");
          console.error("[DialerProvider] This usually means the TwiML App Voice URL is not configured correctly");
          console.error("[DialerProvider] Check that TWILIO_TWIML_APP_SID env var is set and the TwiML App Voice URL points to your backend webhook");
          // Try to disconnect the call
          try {
            conn.disconnect();
          } catch (e) {
            console.error("[DialerProvider] Error disconnecting timed out call:", e);
          }
          reject(new Error("Conference connection timeout - check Twilio TwiML App configuration"));
        }, 15000);

        conn.on("accept", () => {
          clearTimeout(timeout);
          console.log("[DialerProvider] Conference call accepted - connected!");
          setCallState("in-progress");
          setIsInConference(true);
          resolve();
        });

        conn.on("disconnect", () => {
          clearTimeout(timeout);
          console.log("[DialerProvider] Conference disconnected");
          setConnection(null);
          setCallState("idle");
          setIsInConference(false);
        });

        conn.on("error", (err) => {
          clearTimeout(timeout);
          console.error("[DialerProvider] Conference call error:", err);
          console.error("[DialerProvider] Error details:", JSON.stringify(err, null, 2));
          setError(err.message);
          setCallState("failed");
          setIsInConference(false);
          reject(err);
        });

        conn.on("reject", () => {
          clearTimeout(timeout);
          console.error("[DialerProvider] Conference call rejected");
          setCallState("failed");
          setIsInConference(false);
          reject(new Error("Conference call was rejected"));
        });

        conn.on("cancel", () => {
          clearTimeout(timeout);
          console.log("[DialerProvider] Conference call cancelled");
          setCallState("idle");
          setIsInConference(false);
          reject(new Error("Conference call was cancelled"));
        });
      });

      console.log("[DialerProvider] Successfully connected to conference");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to join conference";
      console.error("[DialerProvider] joinConference failed:", message, err);
      setError(message);
      setCallState("failed");
      setIsInConference(false);
      throw err;
    }
  }, []);

  // Leave the current conference
  const leaveConference = useCallback(() => {
    if (connection) {
      connection.disconnect();
    }
    setIsInConference(false);
  }, [connection]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (deviceRef.current) {
        deviceRef.current.destroy();
      }
    };
  }, []);

  // Clear current lead info when call ends
  useEffect(() => {
    if (callState === "idle") {
      setCurrentLeadInfo(null);
    }
  }, [callState]);

  const value: DialerContextValue = {
    device,
    connection,
    callState,
    currentCallId,
    incomingCall,
    isReady,
    error,
    isInitializing,
    initStep,
    isInConference,
    initializeDevice,
    makeCall,
    answerIncomingCall,
    rejectIncomingCall,
    endCall,
    toggleMute,
    joinConference,
    leaveConference,
    setConnection,
    setCallState,
    setCurrentCallId,
    setError,
    // Persisted selection state
    dialerSelection,
    setDialerSelection,
    // Parallel dialer session state
    parallelSession,
    setParallelSession,
    // Current lead info
    currentLeadInfo,
    setCurrentLeadInfo,
    // Widget minimized state
    isWidgetMinimized,
    setIsWidgetMinimized,
  };

  return (
    <DialerContext.Provider value={value}>
      {children}
    </DialerContext.Provider>
  );
}
