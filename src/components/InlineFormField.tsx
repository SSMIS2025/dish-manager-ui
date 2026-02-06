import * as React from "react";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

interface InlineFormFieldProps {
  label: string;
  required?: boolean;
  children: React.ReactNode;
  className?: string;
}

export const InlineFormField = React.forwardRef<HTMLDivElement, InlineFormFieldProps>(
  ({ label, required, children, className }, ref) => {
    return (
      <div ref={ref} className={cn("flex items-center gap-3", className)}>
        <Label className="min-w-[120px] text-right font-medium text-sm shrink-0">
          {label}{required && <span className="text-destructive ml-1">*</span>}
        </Label>
        <div className="flex-1">{children}</div>
      </div>
    );
  }
);

InlineFormField.displayName = "InlineFormField";

export default InlineFormField;
