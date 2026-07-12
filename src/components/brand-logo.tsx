import { cn } from "@/lib/utils";

interface BrandLogoProps {
  size?: "sm" | "md" | "lg";
  className?: string;
}

export function BrandLogo({ size = "md", className }: BrandLogoProps) {
  const sizes = {
    sm: "h-8 w-8",
    md: "h-10 w-10",
    lg: "h-12 w-12",
  };

  return (
    <div
      className={cn(
        "rounded-lg bg-primary flex items-center justify-center shadow-sm",
        sizes[size],
        className
      )}
    >
      <svg
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-3/5 h-3/5"
      >
        <path
          d="M12 2L2 7V17L12 22L22 17V7L12 2Z"
          fill="currentColor"
          className="text-primary-foreground"
          opacity="0.2"
        />
        <path
          d="M12 8V16M8 10V14M16 10V14"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          className="text-primary-foreground"
        />
        <circle
          cx="12"
          cy="12"
          r="1.5"
          fill="currentColor"
          className="text-primary-foreground"
        />
      </svg>
    </div>
  );
}
