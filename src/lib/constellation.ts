import type { Project } from "@/types/project";

export interface ConstellationNode {
  project: Project;
  x: number;
  y: number;
  tooltipSide: "left" | "right" | "top" | "bottom";
}

export interface ConstellationEdge {
  from: ConstellationNode;
  to: ConstellationNode;
}

const CENTERS = [
  { x: 180, y: 155 },
  { x: 500, y: 135 },
  { x: 815, y: 170 },
  { x: 245, y: 390 },
  { x: 585, y: 380 },
  { x: 850, y: 405 },
  { x: 475, y: 285 },
  { x: 710, y: 285 },
];

function hashString(value: string): number {
  let hash = 5381;
  for (const character of value) {
    hash = (hash * 33) ^ character.charCodeAt(0);
  }
  return hash >>> 0;
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(Math.max(value, minimum), maximum);
}

export function buildConstellation(projects: Project[]): {
  nodes: ConstellationNode[];
  edges: ConstellationEdge[];
} {
  const categories = Array.from(new Set(projects.map((project) => project.category))).sort(
    (a, b) => a.localeCompare(b, "ko"),
  );
  const nodes: ConstellationNode[] = [];

  for (const [categoryIndex, category] of categories.entries()) {
    const center = CENTERS[categoryIndex % CENTERS.length];
    const categoryProjects = projects.filter(
      (project) => project.category === category,
    );

    for (const [projectIndex, project] of categoryProjects.entries()) {
      const hash = hashString(project.repo);
      const angle = ((hash % 360) + projectIndex * 137.5) * (Math.PI / 180);
      const radius = projectIndex === 0 ? 18 + (hash % 14) : 52 + projectIndex * 16;
      const x = clamp(center.x + Math.cos(angle) * radius, 64, 936);
      const y = clamp(center.y + Math.sin(angle) * radius, 62, 498);
      const tooltipSide =
        x > 760 ? "left" : x < 240 ? "right" : y > 370 ? "top" : "bottom";
      nodes.push({ project, x, y, tooltipSide });
    }
  }

  const edges: ConstellationEdge[] = [];
  for (const category of categories) {
    const categoryNodes = nodes
      .filter((node) => node.project.category === category)
      .sort((a, b) => a.project.repo.localeCompare(b.project.repo));
    for (let index = 1; index < categoryNodes.length; index += 1) {
      edges.push({ from: categoryNodes[index - 1], to: categoryNodes[index] });
    }
  }

  return { nodes, edges };
}

export interface Point {
  x: number;
  y: number;
}

const MAGNETIC_PULL_STRENGTH = 0.35;

export function computeMagneticOffset(
  pointer: Point,
  center: Point,
  maxOffset: number,
): Point {
  const dx = pointer.x - center.x;
  const dy = pointer.y - center.y;
  const distance = Math.hypot(dx, dy);
  if (distance === 0) return { x: 0, y: 0 };

  const clampedDistance = Math.min(
    distance,
    maxOffset / MAGNETIC_PULL_STRENGTH,
  );
  const factor = (clampedDistance * MAGNETIC_PULL_STRENGTH) / distance;
  return { x: dx * factor, y: dy * factor };
}
