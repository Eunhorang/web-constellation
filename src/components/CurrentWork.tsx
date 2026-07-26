import { ProjectCard } from "./ProjectCard";
import { SectionHeading } from "./Common";
import type { Project } from "@/types/project";

export function CurrentWork({ projects }: { projects: Project[] }) {
  const current = projects.filter(
    (project) => project.status === "building" || project.status === "experiment",
  );
  if (current.length === 0) return null;

  return (
    <section className="section page-container" aria-labelledby="current-work-title">
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
