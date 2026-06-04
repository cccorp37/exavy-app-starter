import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface GradientIconProps {
  icon: LucideIcon;
  /** Tailwind gradient classes, e.g. "from-violet-500 to-fuchsia-500" */
  gradient?: string;
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
  rounded?: "md" | "lg" | "xl" | "2xl";
}

const sizeMap = {
  sm: { box: "w-8 h-8", icon: "w-4 h-4" },
  md: { box: "w-10 h-10", icon: "w-5 h-5" },
  lg: { box: "w-12 h-12", icon: "w-6 h-6" },
  xl: { box: "w-16 h-16", icon: "w-8 h-8" },
};

/**
 * Modern Bauhaus-style icon wrapper:
 * - Bold gradient background
 * - Soft inner highlight + outer shadow
 * - Crisp white Lucide icon
 */
export const GradientIcon = ({
  icon: Icon,
  gradient = "from-primary to-secondary",
  size = "md",
  className,
  rounded = "xl",
}: GradientIconProps) => {
  const s = sizeMap[size];
  return (
    <div
      className={cn(
        "relative flex items-center justify-center shrink-0",
        s.box,
        `rounded-${rounded}`,
        "bg-gradient-to-br",
        gradient,
        "shadow-lg shadow-foreground/10 ring-1 ring-white/20",
        "before:absolute before:inset-0 before:rounded-[inherit] before:bg-gradient-to-b before:from-white/25 before:to-transparent before:opacity-60 before:pointer-events-none",
        className,
      )}
    >
      <Icon className={cn(s.icon, "relative text-white drop-shadow-sm")} strokeWidth={2.25} />
    </div>
  );
};
