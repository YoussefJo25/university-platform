import Link from "next/link";
import type { MouseEventHandler, ReactNode } from "react";

const baseClasses =
  "inline-flex items-center justify-center rounded-full bg-gradient-to-l from-navy to-turquoise px-6 py-3 text-sm font-semibold text-white shadow-md transition-transform hover:scale-105 hover:shadow-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-turquoise focus-visible:ring-offset-2";

type GradientButtonProps = {
  children: ReactNode;
  href?: string;
  type?: "button" | "submit" | "reset";
  disabled?: boolean;
  className?: string;
  onClick?: MouseEventHandler<HTMLButtonElement>;
};

export default function GradientButton({
  children,
  href,
  type = "button",
  disabled,
  className,
  onClick,
}: GradientButtonProps) {
  if (href) {
    return (
      <Link href={href} className={`${baseClasses} ${className ?? ""}`}>
        {children}
      </Link>
    );
  }

  return (
    <button
      type={type}
      disabled={disabled}
      onClick={onClick}
      className={`${baseClasses} ${className ?? ""}`}
    >
      {children}
    </button>
  );
}
