import { memo, type CSSProperties } from "react";
import { ExternalLink, StatusBadge } from "./Common";
import { GitBranchIcon } from "./Icons";
import {
  formatKoreanDate,
  formatKoreanDateTime,
  projectElementId,
} from "@/lib/projects";
import type { Project } from "@/types/project";

interface ProjectCardProps {
  project: Project;
  variant?: "featured" | "standard" | "compact";
  withAnchor?: boolean;
}

export const ProjectCard = memo(function ProjectCard({
  project,
  variant = "standard",
  withAnchor = false,
}: ProjectCardProps) {
  const latestUpdate = project.updateHistory[0];
  const previousUpdates = project.updateHistory.slice(1, 6);
  const hasMoreUpdates = project.updateHistory.length > 6;

  return (
    <article
      id={withAnchor ? projectElementId(project.repo) : undefined}
      className={`project-card project-card--${variant}`}
      style={{ "--project-accent": project.accent } as CSSProperties}
      tabIndex={withAnchor ? -1 : undefined}
    >
      <div className="project-card__topline">
        <StatusBadge status={project.status} />
        <span className="project-card__category">
          {project.sourceOnly ? "소스 프로젝트" : project.category}
        </span>
      </div>

      <div className="project-card__copy">
        <h3>{project.title}</h3>
        <p>{project.description}</p>
      </div>

      <ul className="tag-list" aria-label={`${project.title} 태그`}>
        {project.tags.slice(0, variant === "compact" ? 3 : 5).map((tag) => (
          <li key={tag}>{tag}</li>
        ))}
      </ul>

      <div className="project-card__meta">
        <span>마지막 코드 업데이트</span>
        <time dateTime={project.updatedAt}>{formatKoreanDate(project.updatedAt)}</time>
      </div>

      <div className="project-card__updates">
        <h4>최근 변경</h4>
        <p>
          {latestUpdate?.summary ?? "변경 내용을 아직 확인하지 못했습니다."}
        </p>

        {variant === "standard" && previousUpdates.length > 0 ? (
          <details className="project-card__update-history">
            <summary>
              {hasMoreUpdates
                ? "이전 업데이트 중 최근 5건 보기"
                : `이전 업데이트 ${previousUpdates.length}건 보기`}
            </summary>
            <ol>
              {previousUpdates.map((update, index) => (
                <li key={`${update.date}-${index}`}>
                  <div className="project-card__update-entry">
                    <time dateTime={update.date}>
                      {formatKoreanDateTime(update.date)}
                    </time>
                    <p>{update.summary}</p>
                  </div>
                </li>
              ))}
            </ol>
            {hasMoreUpdates ? (
              <p className="project-card__update-note">
                더 이전 변경 기록은 아래 GitHub 보기에서 확인할 수 있습니다.
              </p>
            ) : null}
          </details>
        ) : null}
      </div>

      <div className="project-card__links">
        {project.liveUrl ? (
          <ExternalLink
            href={project.liveUrl}
            className="text-link text-link--primary"
            ariaLabel={`${project.title} 사이트 방문`}
          >
            사이트 방문
          </ExternalLink>
        ) : null}
        <ExternalLink
          href={project.githubUrl}
          className="text-link"
          ariaLabel={`${project.title} GitHub 저장소 보기`}
          showArrow={false}
        >
          <GitBranchIcon className="link-icon" />
          GitHub 보기
        </ExternalLink>
      </div>
    </article>
  );
});
