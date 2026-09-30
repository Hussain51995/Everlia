type ThemeLoaderProps = {
  label?: string;
  className?: string;
  size?: "sm" | "md" | "lg";
};

const sizeClasses = {
  sm: "h-8 w-8 border-2",
  md: "h-11 w-11 border-[3px]",
  lg: "h-14 w-14 border-4",
};

export function ThemeLoader({
  label,
  className = "",
  size = "md",
}: ThemeLoaderProps) {
  return (
    <div
      className={`flex flex-col items-center justify-center gap-3 ${className}`}
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <div className="relative">
        <div
          className={`${sizeClasses[size]} rounded-full border-[#C4EBF2] border-t-[#38B2D1] animate-spin`}
        />
        <div className="absolute inset-0 grid place-items-center">
          <span className="h-2 w-2 rounded-full bg-[#0B1F3D]" />
        </div>
      </div>
      {label ? (
        <p className="text-xs font-semibold text-[#557393]">{label}</p>
      ) : (
        <span className="sr-only">Loading</span>
      )}
    </div>
  );
}
