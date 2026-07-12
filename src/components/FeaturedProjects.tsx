import { ProjectCard } from "./ProjectCard";
import { SectionHeading } from "./Common";
import type { Project } from "@/types/project";

export function FeaturedProjects({ projects }: { projects: Project[] }) {
  if (projects.length === 0) return null;

  return (
    <section className="section page-container" aria-labelledby="featured-title">
      <SectionHeading
        eyebrow="SELECTED COORDINATES"
        title="대표 프로젝트"
        description="지금의 관심사와 작업 방향을 잘 보여주는 세 개의 좌표입니다."
        id="featured-title"
      />
      <div className="project-grid project-grid--featured">
        {projects.map((project) => (
          <ProjectCard key={project.repo} project={project} variant="featured" />
        ))}
      </div>
    </section>
  );
}
