import { ExternalLink } from "./Common";
import { formatKoreanDate } from "@/lib/projects";

interface SiteFooterProps {
  siteName: string;
  owner: string;
  generatedAt: string;
  githubUrl: string;
}

export function SiteFooter({
  siteName,
  owner,
  generatedAt,
  githubUrl,
}: SiteFooterProps) {
  return (
    <footer className="site-footer">
      <div className="page-container site-footer__inner">
        <div>
          <p className="site-footer__name">{siteName}</p>
          <p className="site-footer__note">Built quietly, connected thoughtfully.</p>
        </div>
        <div className="site-footer__meta">
          <span>
            마지막 동기화 <time dateTime={generatedAt}>{formatKoreanDate(generatedAt)}</time>
          </span>
          <ExternalLink href={githubUrl}>GitHub</ExternalLink>
          <span>© {new Date().getFullYear()} {owner}</span>
        </div>
      </div>
    </footer>
  );
}
