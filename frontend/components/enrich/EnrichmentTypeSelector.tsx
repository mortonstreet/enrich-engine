"use client";

import { Mail, Phone, Sparkles, Check } from "lucide-react";

export type EnrichmentFlowType = "email" | "phone" | "first_line";

interface EnrichmentTypeSelectorProps {
  value: EnrichmentFlowType;
  onChange: (type: EnrichmentFlowType) => void;
  disabled?: boolean;
}

const enrichmentTypes = [
  {
    id: "email" as EnrichmentFlowType,
    name: "Email",
    description: "Find work emails using smart guessing + validation",
    icon: Mail,
    badge: "Recommended",
  },
  {
    id: "phone" as EnrichmentFlowType,
    name: "Phone",
    description: "Find direct phone numbers via Prospeo",
    icon: Phone,
  },
  {
    id: "first_line" as EnrichmentFlowType,
    name: "First Line",
    description: "AI-generated personalized opening lines",
    icon: Sparkles,
    badge: "New",
  },
];

export function EnrichmentTypeSelector({
  value,
  onChange,
  disabled,
}: EnrichmentTypeSelectorProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {enrichmentTypes.map((type) => {
        const Icon = type.icon;
        const isSelected = value === type.id;

        return (
          <button
            key={type.id}
            type="button"
            onClick={() => onChange(type.id)}
            disabled={disabled}
            className={`
              relative flex flex-col items-center p-6 rounded-xl border-2 transition-all
              ${
                isSelected
                  ? "border-primary bg-primary/5"
                  : "border-border hover:border-primary/50 hover:bg-muted/50"
              }
              ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}
            `}
          >
            {type.badge && (
              <span
                className={`
                  absolute top-2 right-2 px-2 py-0.5 text-xs font-medium rounded-full
                  ${type.badge === "Recommended" ? "bg-primary/10 text-primary" : "bg-purple-100 text-purple-700"}
                `}
              >
                {type.badge}
              </span>
            )}

            {isSelected && (
              <div className="absolute top-2 left-2">
                <Check className="w-5 h-5 text-primary" />
              </div>
            )}

            <div
              className={`
                w-12 h-12 rounded-xl flex items-center justify-center mb-3
                ${isSelected ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}
              `}
            >
              <Icon className="w-6 h-6" />
            </div>

            <h3 className="font-semibold text-foreground">{type.name}</h3>
            <p className="text-xs text-muted-foreground text-center mt-1">
              {type.description}
            </p>
          </button>
        );
      })}
    </div>
  );
}
