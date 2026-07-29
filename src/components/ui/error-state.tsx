import * as React from "react"
import { AlertCircle, RefreshCw } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "./button"

export interface ErrorStateProps extends React.HTMLAttributes<HTMLDivElement> {
  title?: string
  description: string
  retryAction?: {
    label: string
    onClick: () => void
    isLoading?: boolean
  }
}

export function ErrorState({
  className,
  title = "Something went wrong",
  description,
  retryAction,
  ...props
}: ErrorStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center py-16 text-center bg-card border border-border/80 rounded-2xl p-8 max-w-md mx-auto mt-12 shadow-sm animate-in fade-in zoom-in-95 duration-200",
        className
      )}
      {...props}
    >
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10 text-destructive mb-4">
        <AlertCircle size={24} />
      </div>
      <h3 className="text-sm font-semibold text-foreground">{title}</h3>
      <p className="text-xs text-muted-foreground mt-2 max-w-xs leading-relaxed">
        {description}
      </p>
      {retryAction && (
        <Button
          onClick={retryAction.onClick}
          disabled={retryAction.isLoading}
          className="mt-6 flex items-center gap-2 cursor-pointer min-w-[140px]"
          size="sm"
        >
          <RefreshCw
            size={14}
            className={retryAction.isLoading ? "animate-spin" : ""}
          />
          {retryAction.label}
        </Button>
      )}
    </div>
  )
}
