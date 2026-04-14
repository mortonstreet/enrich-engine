"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Device, Call } from "@twilio/voice-sdk";
import { get, post, patch } from "@/lib/api";
import { QUERY_KEYS, ENDPOINTS } from "@/lib/config";
import type { CapabilityTokenResponse } from "@shared/types/src";

type CallState = "idle" | "initiated" | "ringing" | "in-progress" | "completed" | "failed";
type TwilioConnection = Call;

interface UseDialerReturn {
  device: Device | null;
  connection: TwilioConnection | null;
  callState: CallState;
  currentCallId: string | null;
  incomingCall: TwilioConnection | null;
  isReady: boolean;
  error: string | null;
  initializeDevice: () => Promise<boolean>;
  makeCall: (toNumber: string, leadId?: string, campaignId?: string, fromNumber?: string) => Promise<void>;
  endCall: () => Promise<void>;
  answerIncomingCall: () => void;
  rejectIncomingCall: () => void;
  toggleMute: () => void;
}

export function useDialer(): UseDialerReturn {
  const [device, setDevice] = useState<Device | null>(null);
  const [connection, setConnection] = useState<TwilioConnection | null>(null);
  const [callState, setCallState] = useState<CallState>("idle");
  const [currentCallId, setCurrentCallId] = useState<string | null>(null);
  const [incomingCall, setIncomingCall] = useState<TwilioConnection | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const deviceRef = useRef<Device | null>(null);
  const queryClient = useQueryClient();

  // Fetch capability token
  const { data: _tokenData, refetch: refetchToken } = useQuery({
    queryKey: QUERY_KEYS.dialerToken(),
    queryFn: async () => {
      const response = await get<{ data: CapabilityTokenResponse }>(ENDPOINTS.DIALER.TOKEN);
      return response.data;
    },
    enabled: false,
    staleTime: 1000 * 60 * 50, // Token is valid for 1 hour, refresh at 50 mins
  });

  // Initialize Twilio device - returns promise that resolves when device is ready
  const initializeDevice = useCallback(async (): Promise<boolean> => {
    try {
      setError(null);
      const { data } = await refetchToken();

      if (!data?.token) {
        throw new Error("Failed to get capability token");
      }

      // Clean up existing device
      if (deviceRef.current) {
        deviceRef.current.destroy();
      }

      const newDevice = new Device(data.token);

      // Create a promise that resolves when registered
      const registeredPromise = new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error("Device registration timeout"));
        }, 10000);

        newDevice.on("registered", () => {
          clearTimeout(timeout);
          setIsReady(true);
          console.log("Twilio device registered");
          resolve();
        });

        newDevice.on("error", (err) => {
          clearTimeout(timeout);
          setError(err.message);
          console.error("Twilio device error:", err);
          reject(err);
        });
      });

      newDevice.on("unregistered", () => {
        setIsReady(false);
        console.log("Twilio device unregistered");
      });

      newDevice.on("incoming", (conn: TwilioConnection) => {
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
          // Auto-reset to idle after a brief moment
          setTimeout(() => {
            setCallState((prev) => prev === "completed" ? "idle" : prev);
            setCurrentCallId(null);
          }, 3000);
        });
      });

      newDevice.on("tokenWillExpire", async () => {
        console.log("Token expiring, refreshing...");
        const { data: newData } = await refetchToken();
        if (newData?.token) {
          newDevice.updateToken(newData.token);
        }
      });

      await newDevice.register();
      deviceRef.current = newDevice;
      setDevice(newDevice);

      // Wait for the registered event
      await registeredPromise;
      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to initialize device";
      setError(message);
      console.error("Failed to initialize Twilio device:", err);
      return false;
    }
  }, [refetchToken]);

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

  // Make outbound call - uses deviceRef to avoid stale closure issues
  const makeCall = useCallback(
    async (toNumber: string, leadId?: string, campaignId?: string, fromNumber?: string) => {
      const currentDevice = deviceRef.current;
      if (!currentDevice) {
        throw new Error("Device not ready");
      }

      try {
        setCallState("initiated");

        // First, create call record in backend
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

        // Attach event handlers BEFORE setting connection state
        conn.on("ringing", () => {
          console.log("Call ringing");
          setCallState("ringing");
        });

        conn.on("accept", () => {
          console.log("Call accepted");
          setCallState("in-progress");
        });

        conn.on("disconnect", (call) => {
          // Log disconnect details to help debug abrupt call endings
          console.log("Call disconnected");
          console.log("Disconnect reason:", call?.parameters?.Reason || "unknown");
          console.log("Call parameters:", JSON.stringify(call?.parameters || {}, null, 2));
          setConnection(null);
          setCallState("completed");
          // Auto-reset to idle after a brief moment for disposition handling
          setTimeout(() => {
            setCallState((prev) => prev === "completed" ? "idle" : prev);
            setCurrentCallId(null);
          }, 3000);
        });

        conn.on("cancel", () => {
          console.log("Call was canceled");
          setConnection(null);
          setCallState("completed");
          // Auto-reset to idle after a brief moment
          setTimeout(() => {
            setCallState((prev) => prev === "completed" ? "idle" : prev);
            setCurrentCallId(null);
          }, 1000);
        });

        conn.on("error", (err) => {
          console.error("Call error:", err);
          console.error("Error code:", (err as { code?: string }).code);
          console.error("Error details:", JSON.stringify(err, null, 2));
          setError(err.message);
          setCallState("failed");
          // Auto-reset to idle after showing the error
          setTimeout(() => {
            setCallState((prev) => prev === "failed" ? "idle" : prev);
            setCurrentCallId(null);
            setError(null);
          }, 3000);
        });

        // Set connection after handlers are attached
        setConnection(conn);
      } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to make call";
        setError(message);
        setCallState("failed");
        throw err;
      }
    },
    [initiateCallMutation]
  );

  // End call mutation
  const endCallMutation = useMutation({
    mutationFn: async (callId: string) => {
      await post(ENDPOINTS.CALLS.END(callId));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.calls() });
    },
  });

  // End call
  const endCall = useCallback(async () => {
    // First notify backend to end the call on Twilio's side
    if (currentCallId) {
      try {
        await endCallMutation.mutateAsync(currentCallId);
      } catch (error) {
        console.error("Error ending call on backend:", error);
      }
    }
    // Then disconnect the browser connection
    // The disconnect event handler will update state to "completed"
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

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (deviceRef.current) {
        deviceRef.current.destroy();
      }
    };
  }, []);

  return {
    device,
    connection,
    callState,
    currentCallId,
    incomingCall,
    isReady,
    error,
    initializeDevice,
    makeCall,
    endCall,
    answerIncomingCall,
    rejectIncomingCall,
    toggleMute,
  };
}

interface TwilioConfig {
  id: string;
  organizationId: string;
  accountSid: string;
  phoneNumbers: string[];
  createdAt: string;
  updatedAt: string;
}

// Hook for dialer configuration
export function useDialerConfig(organizationId?: string) {
  return useQuery({
    queryKey: QUERY_KEYS.dialerConfig(organizationId),
    queryFn: async () => {
      if (!organizationId) return null;
      const response = await get<{ data: TwilioConfig | null }>(ENDPOINTS.DIALER.CONFIG(organizationId));
      return response?.data ?? null;
    },
    enabled: !!organizationId,
  });
}

// Hook for creating dialer config
export function useCreateDialerConfig() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      organizationId: string;
      accountSid: string;
      authToken: string;
      phoneNumbers?: string[];
    }) => {
      const response = await post<{ data: unknown }>(ENDPOINTS.DIALER.CREATE_CONFIG, params);
      return response.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.dialerConfig(variables.organizationId) });
    },
  });
}

// Hook for updating dialer config
export function useUpdateDialerConfig() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      organizationId: string;
      accountSid?: string;
      authToken?: string;
      phoneNumbers?: string[];
    }) => {
      const { organizationId, ...data } = params;
      const response = await patch<{ data: unknown }>(
        ENDPOINTS.DIALER.UPDATE_CONFIG(organizationId),
        data
      );
      return response.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.dialerConfig(variables.organizationId) });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.dialerPhoneNumbers(variables.organizationId) });
    },
  });
}

// Hook for fetching phone numbers from Twilio account
export function useTwilioPhoneNumbers(organizationId?: string, enabled = true) {
  return useQuery({
    queryKey: QUERY_KEYS.dialerPhoneNumbers(organizationId),
    queryFn: async () => {
      if (!organizationId) return [];
      const response = await get<{ data: TwilioPhoneNumber[] }>(
        ENDPOINTS.DIALER.PHONE_NUMBERS(organizationId)
      );
      return response?.data ?? [];
    },
    enabled: !!organizationId && enabled,
  });
}

interface TwilioPhoneNumber {
  phoneNumber: string;
  friendlyName: string;
  locality: string | null; // City (e.g., "Payson")
  region: string | null; // State/Province (e.g., "AZ")
  callerIdVerified?: boolean;
  capabilities: {
    voice: boolean;
    sms: boolean;
    mms: boolean;
  };
}
