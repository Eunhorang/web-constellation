import { ExternalLink, StatusBadge } from "./Common";
import { GitBranchIcon } from "./Icons";
import { formatKoreanDate, projectElementId } from "@/lib/projects";
import type { Project } from "@/types/project";

interface ProjectCardProps {
  project: Project;
  variant?: "featured" | "standard" | "compact";
  withAnchor?: boolean;
}

export function ProjectCard({
  project,
  variant = "standard",
  withAnchor = false,
}: ProjectCardProps) {
  return (
    <article
      id={withAnchor ? projectElementId(project.repo) : undefined}
      className={`project-card project-card--${variant}`}
      style={{ "--project-accent": project.accent } as React.CSSProperties}
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
        <span>마지막 업데이트</span>
        <time dateTime={project.updatedAt}>{formatKoreanDate(project.updatedAt)}</time>
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
}
