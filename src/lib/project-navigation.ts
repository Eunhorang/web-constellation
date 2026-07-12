import { projectElementId } from "./projects";

export const PROJECT_SELECT_EVENT = "web-constellation:select-project";

export interface ProjectSelectDetail {
  repo: string;
}

export function requestProjectCard(repo: string) {
  window.dispatchEvent(
    new CustomEvent<ProjectSelectDetail>(PROJECT_SELECT_EVENT, {
      detail: { repo },
    }),
  );
}

export function focusProjectCard(repo: string): boolean {
  const target = document.getElementById(projectElementId(repo));
  if (!target) return false;
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  target.scrollIntoView({
    behavior: reduceMotion ? "auto" : "smooth",
    block: "center",
  });
  window.setTimeout(
    () => target.focus({ preventScroll: true }),
    reduceMotion ? 0 : 320,
  );
  return true;
}
