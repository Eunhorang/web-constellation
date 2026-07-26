import type { MouseEventHandler, ReactNode } from "react";
import { ExternalArrowIcon } from "./Icons";
import { STATUS_LABELS } from "@/lib/projects";
import type { ProjectStatus } from "@/types/project";

interface ExternalLinkProps {
  href: string;
  children: ReactNode;
  className?: string;
  ariaLabel?: string;
  showArrow?: boolean;
  onClick?: MouseEventHandler<HTMLAnchorElement>;
}

export function ExternalLink({
  href,
  children,
  className,
  ariaLabel,
  showArrow = true,
  onClick,
}: ExternalLinkProps) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={className}
      aria-label={ariaLabel ? `${ariaLabel} (새 탭에서 열림)` : undefined}
      onClick={onClick}
    >
      {children}
      {showArrow ? <ExternalArrowIcon className="link-icon" /> : null}
      <span className="sr-only">(새 탭에서 열림)</span>
    </a>
  );
}

export function StatusBadge({ status }: { status: ProjectStatus }) {
  return (
    <span className="status-badge" data-status={status}>
      <span className="status-badge__mark" aria-hidden="true" />
      {STATUS_LABELS[status]}
    </span>
  );
}

interface SectionHeadingProps {
  eyebrow: string;
  title: string;
  description?: string;
  id: string;
}

export function SectionHeading({
  eyebrow,
  title,
  description,
  id,
}: SectionHeadingProps) {
  return (
    <header className="section-heading">
      <p className="eyebrow">{eyebrow}</p>
      <div className="section-heading__copy">
        <h2 id={id} tabIndex={-1}>{title}</h2>
        {description ? <p>{description}</p> : null}
      </div>
    </header>
  );
}
