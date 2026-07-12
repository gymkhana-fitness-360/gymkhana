import { cn } from "@/lib/utils";

interface LogoProps {
  size?: "sm" | "md" | "lg";
  className?: string;
}

const sizeClasses = {
  sm: "text-lg",
  md: "text-2xl",
  lg: "text-3xl",
};

export function Logo({ size = "md", className }: LogoProps) {
  return (
    <span className={cn(sizeClasses[size], className)}>
      💪
    </span>
  );
}
