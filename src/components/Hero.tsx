import { ExternalLink } from "./Common";
import { formatKoreanDate } from "@/lib/projects";

interface HeroProps {
  englishLabel: string;
  siteName: string;
  tagline: string;
  description: string;
  totalCount: number;
  liveCount: number;
  generatedAt: string;
  githubUrl: string;
}

export function Hero({
  englishLabel,
  siteName,
  tagline,
  description,
  totalCount,
  liveCount,
  generatedAt,
  githubUrl,
}: HeroProps) {
  return (
    <section className="hero page-container" aria-labelledby="hero-title">
      <div className="hero__copy">
        <p className="eyebrow hero__label">{englishLabel}</p>
        <h1 id="hero-title">{siteName}</h1>
        <p className="hero__lead">
          <strong>{tagline}</strong>
          <span>{description}</span>
        </p>
        <div className="hero__actions">
          <a className="button button--primary" href="#map">별자리 탐색하기</a>
          <ExternalLink href={githubUrl} className="button button--quiet">GitHub 보기</ExternalLink>
        </div>
      </div>

      <aside className="hero__coordinates" aria-label="웹 별자리 요약">
        <div className="hero__orbit" aria-hidden="true">
          <span className="hero__planet" />
          <span className="hero__star hero__star--one" />
          <span className="hero__star hero__star--two" />
        </div>
        <dl className="hero-stats">
          <div>
            <dt>전체 프로젝트</dt>
            <dd>{totalCount}<span>개</span></dd>
          </div>
          <div>
            <dt>운영 중</dt>
            <dd>{liveCount}<span>개</span></dd>
          </div>
          <div className="hero-stats__date">
            <dt>마지막 동기화</dt>
            <dd><time dateTime={generatedAt}>{formatKoreanDate(generatedAt)}</time></dd>
          </div>
        </dl>
      </aside>
    </section>
  );
}
