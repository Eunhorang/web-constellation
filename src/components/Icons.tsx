interface IconProps {
  className?: string;
}

const commonProps = {
  "aria-hidden": true,
  focusable: false,
  viewBox: "0 0 24 24",
} as const;

export function ExternalArrowIcon({ className }: IconProps) {
  return (
    <svg {...commonProps} className={className} fill="none" stroke="currentColor">
      <path d="M7 17 17 7M9 7h8v8" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" />
    </svg>
  );
}

export function GitBranchIcon({ className }: IconProps) {
  return (
    <svg {...commonProps} className={className} fill="none" stroke="currentColor">
      <circle cx="7" cy="6" r="2.2" strokeWidth="1.7" />
      <circle cx="17" cy="7" r="2.2" strokeWidth="1.7" />
      <circle cx="7" cy="18" r="2.2" strokeWidth="1.7" />
      <path d="M7 8.2v7.6M9.2 8h3.3A4.5 4.5 0 0 0 17 3.5v1.3" strokeLinecap="round" strokeWidth="1.7" />
    </svg>
  );
}

export function SearchIcon({ className }: IconProps) {
  return (
    <svg {...commonProps} className={className} fill="none" stroke="currentColor">
      <circle cx="10.5" cy="10.5" r="5.8" strokeWidth="1.8" />
      <path d="m15 15 4.2 4.2" strokeLinecap="round" strokeWidth="1.8" />
    </svg>
  );
}

export function MailIcon({ className }: IconProps) {
  return (
    <svg {...commonProps} className={className} fill="none" stroke="currentColor">
      <rect x="3.5" y="5" width="17" height="14" rx="2" strokeWidth="1.7" />
      <path d="m5 7 7 5 7-5" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.7" />
    </svg>
  );
}

export function MenuIcon({ className }: IconProps) {
  return (
    <svg {...commonProps} className={className} fill="none" stroke="currentColor">
      <path d="M4 7h16M4 12h16M4 17h16" strokeLinecap="round" strokeWidth="1.8" />
    </svg>
  );
}

export function CloseIcon({ className }: IconProps) {
  return (
    <svg {...commonProps} className={className} fill="none" stroke="currentColor">
      <path d="m6 6 12 12M18 6 6 18" strokeLinecap="round" strokeWidth="1.8" />
    </svg>
  );
}

export function ResetIcon({ className }: IconProps) {
  return (
    <svg {...commonProps} className={className} fill="none" stroke="currentColor">
      <path d="M5.5 8.5A7 7 0 1 1 5 15M5.5 8.5V4.8M5.5 8.5h3.7" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" />
    </svg>
  );
}

export function ChevronIcon({ className }: IconProps) {
  return (
    <svg {...commonProps} className={className} fill="none" stroke="currentColor">
      <path d="m8 10 4 4 4-4" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" />
    </svg>
  );
}
