import { ExternalLink } from "./Common";
import { GitBranchIcon, MailIcon } from "./Icons";
import type { SiteConfig } from "@/types/project";

export function About({ config }: { config: SiteConfig }) {
  const githubUrl = `https://github.com/${config.githubUsername}`;

  return (
    <section id="about" className="section page-container" aria-labelledby="about-title">
      <div className="about-panel">
        <div>
          <p className="eyebrow">ABOUT THE MAKER</p>
          <h2 id="about-title" tabIndex={-1}>
            <span className="about-panel__title">{config.aboutTitle}</span>
            <span className="about-panel__nickname">{config.aboutNickname}</span>
          </h2>
        </div>
        <div className="about-panel__body">
          <p>{config.aboutText}</p>
          <nav className="about-links" aria-label="제작자 채널">
            <ExternalLink href={githubUrl} className="about-link" showArrow={false}>
              <GitBranchIcon className="link-icon" />
              GitHub
            </ExternalLink>
            <a className="about-link" href={`mailto:${config.email}`}>
              <MailIcon className="link-icon" />
              이메일
            </a>
            {config.blogUrl ? (
              <ExternalLink href={config.blogUrl} className="about-link">블로그</ExternalLink>
            ) : null}
            {config.channelUrl && config.channelLabel ? (
              <ExternalLink href={config.channelUrl} className="about-link">
                {config.channelLabel}
              </ExternalLink>
            ) : null}
          </nav>
        </div>
      </div>
    </section>
  );
}
