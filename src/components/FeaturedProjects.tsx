import { ProjectCard } from "./ProjectCard";
import { SectionHeading } from "./Common";
import { useRevealOnScroll } from "@/lib/use-reveal-on-scroll";
import type { Project } from "@/types/project";

export function FeaturedProjects({ projects }: { projects: Project[] }) {
  // 훅 호출은 조건부 return보다 먼저 와야 합니다.
  const { ref, className } = useRevealOnScroll<HTMLElement>();
  if (projects.length === 0) return null;

  return (
    <section
      ref={ref}
      className={`section page-container${className ? ` ${className}` : ""}`}
      aria-labelledby="featured-title"
    >
      <SectionHeading
        eyebrow="SELECTED COORDINATES"
        title="대표 프로젝트"
        description="지금의 관심사와 작업 방향을 잘 보여주는 세 개의 좌표입니다."
        id="featured-title"
      />
      <div className="project-grid project-grid--featured">
        {projects.map((project, index) => (
          <ProjectCard
            key={project.repo}
            project={project}
            variant="featured"
            index={index + 1}
          />
        ))}
      </div>
    </section>
  );
}
