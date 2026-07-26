import { ProjectCard } from "./ProjectCard";
import { SectionHeading } from "./Common";
import { useRevealOnScroll } from "@/lib/use-reveal-on-scroll";
import type { Project } from "@/types/project";

export function CurrentWork({ projects }: { projects: Project[] }) {
  // 훅 호출은 조건부 return보다 먼저 와야 합니다.
  const { ref, className } = useRevealOnScroll<HTMLElement>();
  const current = projects.filter(
    (project) => project.status === "building" || project.status === "experiment",
  );
  if (current.length === 0) return null;

  return (
    <section
      ref={ref}
      className={`section page-container${className ? ` ${className}` : ""}`}
      aria-labelledby="current-work-title"
    >
      <SectionHeading
        eyebrow="IN PROGRESS"
        title="현재 만들고 있는 것"
        description="아직 완성보다 가능성에 가까운 프로젝트를 기록합니다."
        id="current-work-title"
      />
      <div className="project-grid project-grid--current">
        {current.map((project, index) => (
          <ProjectCard
            key={project.repo}
            project={project}
            variant="compact"
            index={index + 1}
          />
        ))}
      </div>
    </section>
  );
}
