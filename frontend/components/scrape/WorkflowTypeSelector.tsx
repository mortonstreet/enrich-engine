"use client";

import { ScrapeWorkflowType } from "@shared/types/src";
import { Building2, Users, Globe, Link, FileText } from "lucide-react";

interface WorkflowOption {
  type: ScrapeWorkflowType;
  title: string;
  description: string;
  icon: React.ReactNode;
}

const workflowOptions: WorkflowOption[] = [
  {
    type: ScrapeWorkflowType.COMPANY_CSV,
    title: "Company List",
    description: "Upload a CSV of company names, then specify roles to find",
    icon: <Building2 className="w-5 h-5" />,
  },
  {
    type: ScrapeWorkflowType.NAME_CSV,
    title: "Name List",
    description: "Upload a CSV with first name, last name, and company columns",
    icon: <Users className="w-5 h-5" />,
  },
  {
    type: ScrapeWorkflowType.DOMAIN_CSV,
    title: "Domain List",
    description: "Upload a CSV of company domains/websites, then specify roles",
    icon: <Globe className="w-5 h-5" />,
  },
  {
    type: ScrapeWorkflowType.SINGLE_URL,
    title: "Single URL",
    description: "Enter a company LinkedIn or website URL to find people",
    icon: <Link className="w-5 h-5" />,
  },
  {
    type: ScrapeWorkflowType.PDF_UPLOAD,
    title: "PDF Upload",
    description: "Extract company names from a PDF document",
    icon: <FileText className="w-5 h-5" />,
  },
];

interface WorkflowTypeSelectorProps {
  selectedType: ScrapeWorkflowType | null;
  onSelect: (type: ScrapeWorkflowType) => void;
}

export function WorkflowTypeSelector({
  selectedType,
  onSelect,
}: WorkflowTypeSelectorProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
      {workflowOptions.map((option) => {
        const isSelected = selectedType === option.type;
        const isDisabled = option.type === ScrapeWorkflowType.PDF_UPLOAD; // Coming soon

        return (
          <button
            key={option.type}
            onClick={() => !isDisabled && onSelect(option.type)}
            disabled={isDisabled}
            className={`
              relative flex flex-col items-start p-4 rounded-lg border-2 transition-all text-left
              ${isSelected
                ? "border-primary bg-primary/5"
                : "border-muted hover:border-muted-foreground/30"
              }
              ${isDisabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}
            `}
          >
            {isDisabled && (
              <span className="absolute top-2 right-2 text-xs bg-muted px-2 py-0.5 rounded">
                Coming soon
              </span>
            )}
            <div
              className={`
                w-10 h-10 rounded-lg flex items-center justify-center mb-3
                ${isSelected ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}
              `}
            >
              {option.icon}
            </div>
            <h3 className="font-medium text-sm mb-1">{option.title}</h3>
            <p className="text-xs text-muted-foreground">{option.description}</p>
          </button>
        );
      })}
    </div>
  );
}
