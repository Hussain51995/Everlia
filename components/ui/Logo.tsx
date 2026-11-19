import Image from "next/image";
import Link from "next/link";

const LOGO_SRC = {
  color: "/brand/everlia-logo.png",
  white: "/brand/everlia-logo-white.png",
} as const;

type LogoVariant = keyof typeof LOGO_SRC;

type LogoProps = {
  variant?: LogoVariant;
  href?: string;
  className?: string;
  height?: number;
};

export function Logo({
  variant = "color",
  href = "#top",
  className = "",
  height = 44,
}: LogoProps) {
  const width = Math.round(height * (994 / 750));
  const isHashOrExternal = href.startsWith("#") || href.startsWith("http");

  const image = (
    <Image
      src={LOGO_SRC[variant]}
      alt="Everlia"
      width={width}
      height={height}
      className="h-full w-auto object-contain transition-transform group-hover:scale-105"
      priority
    />
  );

  const sharedProps = {
    className: `inline-flex items-center group select-none ${className}`.trim(),
    "aria-label": "Everlia home" as const,
    style: { height },
  };

  if (isHashOrExternal) {
    return (
      <a href={href} {...sharedProps}>
        {image}
      </a>
    );
  }

  return (
    <Link href={href} {...sharedProps}>
      {image}
    </Link>
  );
}
