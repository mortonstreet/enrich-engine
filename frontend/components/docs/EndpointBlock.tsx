"use client";

import { CodeBlock } from "./CodeBlock";

type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

interface EndpointBlockProps {
  method: HttpMethod;
  path: string;
  description: string;
  auth?: "session" | "api-key" | "none";
  requestExample?: string;
  responseExample?: string;
  parameters?: {
    name: string;
    type: string;
    required: boolean;
    description: string;
  }[];
}

const methodColors: Record<HttpMethod, string> = {
  GET: "bg-emerald-100 text-emerald-700 border-emerald-200",
  POST: "bg-blue-100 text-blue-700 border-blue-200",
  PUT: "bg-amber-100 text-amber-700 border-amber-200",
  PATCH: "bg-purple-100 text-purple-700 border-purple-200",
  DELETE: "bg-red-100 text-red-700 border-red-200",
};

export function EndpointBlock({
  method,
  path,
  description,
  auth = "session",
  requestExample,
  responseExample,
  parameters,
}: EndpointBlockProps) {
  return (
    <div className="rounded-xl border border-gray-200 overflow-hidden bg-white mb-8">
      {/* Header */}
      <div className="p-4 bg-gray-50 border-b border-gray-200">
        <div className="flex items-center gap-3 mb-2">
          <span className={`px-2.5 py-1 rounded-md text-xs font-bold font-mono border ${methodColors[method]}`}>
            {method}
          </span>
          <code className="text-sm font-mono text-gray-800">{path}</code>
          {auth !== "none" && (
            <span className={`ml-auto px-2 py-0.5 rounded text-xs font-medium ${
              auth === "api-key"
                ? "bg-violet-100 text-violet-700"
                : "bg-gray-100 text-gray-600"
            }`}>
              {auth === "api-key" ? "API Key" : "Session"}
            </span>
          )}
        </div>
        <p className="text-gray-600 text-sm">{description}</p>
      </div>

      {/* Parameters */}
      {parameters && parameters.length > 0 && (
        <div className="p-4 border-b border-gray-200">
          <h4 className="text-sm font-semibold mb-3">Parameters</h4>
          <div className="space-y-2">
            {parameters.map((param) => (
              <div key={param.name} className="flex items-start gap-3 text-sm">
                <code className="font-mono text-gray-800 bg-gray-100 px-1.5 py-0.5 rounded">
                  {param.name}
                </code>
                <span className="text-gray-500">{param.type}</span>
                {param.required && (
                  <span className="text-xs text-red-500 font-medium">required</span>
                )}
                <span className="text-gray-600 flex-1">{param.description}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Request Example */}
      {requestExample && (
        <div className="p-4 border-b border-gray-200">
          <h4 className="text-sm font-semibold mb-3">Request</h4>
          <CodeBlock code={requestExample} language="json" />
        </div>
      )}

      {/* Response Example */}
      {responseExample && (
        <div className="p-4">
          <h4 className="text-sm font-semibold mb-3">Response</h4>
          <CodeBlock code={responseExample} language="json" />
        </div>
      )}
    </div>
  );
}
