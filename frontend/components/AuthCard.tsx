"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card"
import { cn } from "@/lib/utils"
import EnrichEngineLogo from "@/components/landing/EnrichEngineLogo"

type Size = "md" | "lg" | "xl" | "2xl" | "3xl" | "4xl"

const sizeClass: Record<Size, string> = {
  md: "max-w-md",
  lg: "max-w-lg",
  xl: "max-w-xl",
  "2xl": "max-w-2xl",
  "3xl": "max-w-3xl",
  "4xl": "max-w-4xl",
}

export default function AuthCard({
  title,
  children,
  size = "md",
  className = "",
  variant = "default",
}: {
  title: string
  children: React.ReactNode
  size?: Size
  className?: string
  variant?: "default" | "manus"
}) {
  const isManusStyle = variant === "manus"

  return (
    <Card
      className={cn(
        "mx-auto w-full",
        sizeClass[size],
        isManusStyle && [
          "w-[360px]",
          "bg-white",
          "border-[rgba(0,0,0,0.08)]",
          "rounded-[12px]",
          "shadow-[0px_1px_2px_-0.5px_rgba(0,0,0,0.12),0px_2px_4px_-1px_rgba(0,0,0,0.08)]",
        ],
        className
      )}
    >
      <CardHeader className={cn(isManusStyle && "pb-2")}>
        <div className="flex justify-center mb-4">
          <EnrichEngineLogo size={48} animated />
        </div>
        <CardTitle
          className={cn(
            "text-center",
            isManusStyle
              ? "text-[24px] font-semibold text-[#1A1A1A] tracking-[-0.01em]"
              : "text-2xl md:text-3xl"
          )}
        >
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className={cn(isManusStyle && "pt-2")}>{children}</CardContent>
    </Card>
  )
}
