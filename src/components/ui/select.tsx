'use client';

import * as React from "react";
import { ChevronDown } from "lucide-react";
import { createPortal } from "react-dom";

interface SelectContextValue {
  value: string;
  onValueChange: (value: string) => void;
  open: boolean;
  setOpen: (open: boolean) => void;
  triggerRef: React.RefObject<HTMLButtonElement | null>;
}

const SelectContext = React.createContext<SelectContextValue | undefined>(undefined);

interface SelectProps {
  value?: string;
  onValueChange?: (value: string) => void;
  children: React.ReactNode;
  disabled?: boolean;
}

function Select({ value = "", onValueChange, children, disabled = false }: SelectProps) {
  const [open, setOpen] = React.useState(false);
  const [internalValue, setInternalValue] = React.useState(value);
  const triggerRef = React.useRef<HTMLButtonElement>(null);

  const currentValue = value !== undefined ? value : internalValue;
  const handleValueChange = onValueChange || setInternalValue;

  // Close on escape key
  React.useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && open) {
        setOpen(false);
      }
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [open]);

  return (
    <SelectContext.Provider value={{ value: currentValue, onValueChange: handleValueChange, open, setOpen, triggerRef }}>
      <div className={`relative ${disabled ? 'opacity-50 pointer-events-none' : ''}`}>{children}</div>
    </SelectContext.Provider>
  );
}

interface SelectTriggerProps extends React.HTMLAttributes<HTMLButtonElement> {
  children?: React.ReactNode;
}

const SelectTrigger = React.forwardRef<HTMLButtonElement, SelectTriggerProps>(
  ({ className = "", children, ...props }, ref) => {
    const context = React.useContext(SelectContext);
    if (!context) throw new Error("SelectTrigger must be used within Select");

    const internalRef = context.triggerRef;

    const handleClick = (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      context.setOpen(!context.open);
    };

    return (
      <button
        ref={internalRef}
        type="button"
        onClick={handleClick}
        className={`flex h-10 w-full items-center justify-between rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#003399] focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer ${className}`}
        {...props}
      >
        {children}
        <ChevronDown className={`h-4 w-4 opacity-50 transition-transform ${context.open ? 'rotate-180' : ''}`} />
      </button>
    );
  }
);
SelectTrigger.displayName = "SelectTrigger";

interface SelectValueProps {
  placeholder?: string;
  children?: React.ReactNode;
}

function SelectValue({ placeholder, children }: SelectValueProps) {
  const context = React.useContext(SelectContext);
  if (!context) {
    console.error("SelectValue must be used within Select");
    return <span>Error: Context Missing</span>;
  }

  return <span>{children || context.value || placeholder}</span>;
}

interface SelectContentProps {
  children: React.ReactNode;
  className?: string;
}

function SelectContent({ children, className = "" }: SelectContentProps) {
  const context = React.useContext(SelectContext);
  const [position, setPosition] = React.useState({ top: 0, left: 0, width: 0 });
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  React.useEffect(() => {
    if (context?.open && context.triggerRef.current) {
      const rect = context.triggerRef.current.getBoundingClientRect();
      // Use viewport-relative positioning (fixed positioning)
      setPosition({
        top: rect.bottom + 4,
        left: rect.left,
        width: rect.width
      });
    }
  }, [context?.open]);

  if (!context) throw new Error("SelectContent must be used within Select");
  if (!context.open || !mounted) return null;

  const content = (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-[9998]"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          context.setOpen(false);
        }}
      />
      {/* Dropdown */}
      <div
        style={{
          position: 'fixed',
          top: position.top,
          left: position.left,
          width: position.width,
        }}
        className={`z-[9999] rounded-md border bg-white shadow-lg max-h-48 overflow-y-auto ${className}`}
      >
        <div className="p-1">{children}</div>
      </div>
    </>
  );

  return createPortal(content, document.body);
}

interface SelectItemProps {
  value: string;
  children: React.ReactNode;
}

function SelectItem({ value, children }: SelectItemProps) {
  const context = React.useContext(SelectContext);
  if (!context) throw new Error("SelectItem must be used within Select");

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    context.onValueChange(value);
    context.setOpen(false);
  };

  return (
    <div
      onClick={handleClick}
      className={`relative flex cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-gray-100 ${context.value === value ? "bg-gray-100 font-medium" : ""}`}
    >
      {children}
    </div>
  );
}

export { Select, SelectContent, SelectItem, SelectTrigger, SelectValue };
