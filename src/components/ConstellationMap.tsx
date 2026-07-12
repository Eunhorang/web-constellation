import { useMemo, type CSSProperties } from "react";
import { SectionHeading } from "./Common";
import { buildConstellation } from "@/lib/constellation";
import { requestProjectCard } from "@/lib/project-navigation";
import { projectIdToken, STATUS_LABELS } from "@/lib/projects";
import type { Project } from "@/types/project";

export function ConstellationMap({ projects }: { projects: Project[] }) {
  const constellation = useMemo(() => buildConstellation(projects), [projects]);

  if (projects.length === 0) return null;

  return (
    <section id="map" className="section page-container" aria-labelledby="map-title">
      <SectionHeading
        eyebrow="PROJECT MAP"
        title="웹 별자리 지도"
        description="같은 관심사에서 태어난 프로젝트들을 느슨한 선으로 이었습니다. 좌표를 선택하면 해당 프로젝트 카드로 이동합니다."
        id="map-title"
      />

      <figure className="constellation" aria-labelledby="map-title">
        <figcaption className="sr-only">
          프로젝트를 카테고리별 좌표로 나타낸 지도입니다. 각 프로젝트 버튼을 선택하면 상세 카드로 이동합니다.
        </figcaption>
        <svg
          className="constellation__lines"
          viewBox="0 0 1000 560"
          preserveAspectRatio="none"
          aria-hidden="true"
          focusable="false"
        >
          <g>
            {constellation.edges.map((edge) => (
              <line
                key={`${edge.from.project.repo}-${edge.to.project.repo}`}
                x1={edge.from.x}
                y1={edge.from.y}
                x2={edge.to.x}
                y2={edge.to.y}
              />
            ))}
          </g>
        </svg>

        <ol className="constellation__nodes" aria-label="별자리 프로젝트 목록">
          {constellation.nodes.map((node, index) => {
            const tooltipId = `constellation-tooltip-${projectIdToken(node.project.repo)}`;
            return (
            <li
              key={node.project.repo}
              className="constellation-node"
              style={{
                left: `${(node.x / 1000) * 100}%`,
                top: `${(node.y / 560) * 100}%`,
                "--node-accent": node.project.accent,
              } as CSSProperties}
            >
              <button
                type="button"
                className="constellation-node__button"
                data-featured={node.project.featured}
                data-tooltip-side={node.tooltipSide}
                onClick={() => requestProjectCard(node.project.repo)}
                aria-label={`${node.project.title}, ${STATUS_LABELS[node.project.status]} — 프로젝트 카드로 이동`}
                aria-describedby={tooltipId}
              >
                <span className="constellation-node__index" aria-hidden="true">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <span className="constellation-node__dot" aria-hidden="true" />
                <span id={tooltipId} role="tooltip" className="constellation-node__tooltip">
                  <strong>{node.project.title}</strong>
                  <span>{node.project.description}</span>
                  <small>{node.project.category} · {STATUS_LABELS[node.project.status]}</small>
                </span>
              </button>
            </li>
            );
          })}
        </ol>
      </figure>
    </section>
  );
}
