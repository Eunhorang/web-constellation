import { useEffect, useMemo, useRef, useState } from "react";
import { ProjectCard } from "./ProjectCard";
import { SectionHeading } from "./Common";
import { ChevronIcon, ResetIcon, SearchIcon } from "./Icons";
import {
  DEFAULT_FILTERS,
  filterProjects,
  SORT_LABELS,
  STATUS_LABELS,
  uniqueValues,
} from "@/lib/projects";
import {
  focusProjectCard,
  PROJECT_SELECT_EVENT,
  type ProjectSelectDetail,
} from "@/lib/project-navigation";
import type {
  Project,
  ProjectFilters,
  ProjectSort,
  ProjectStatus,
} from "@/types/project";

const VALID_STATUSES: Array<ProjectStatus | "all"> = [
  "all",
  "live",
  "experiment",
  "building",
  "archived",
];
const VALID_SORTS: ProjectSort[] = ["custom", "updated", "name"];

function filtersFromUrl(projects: Project[]): ProjectFilters {
  if (typeof window === "undefined") return DEFAULT_FILTERS;
  const params = new URLSearchParams(window.location.search);
  const status = params.get("status") as ProjectStatus | "all" | null;
  const sort = params.get("sort") as ProjectSort | null;
  const categories = new Set(projects.map((project) => project.category));
  const tags = new Set(projects.flatMap((project) => project.tags));
  const category = params.get("category");
  const tag = params.get("tag");
  return {
    query: params.get("q") || "",
    status: status && VALID_STATUSES.includes(status) ? status : "all",
    category: category && categories.has(category) ? category : "all",
    tag: tag && tags.has(tag) ? tag : "all",
    sort: sort && VALID_SORTS.includes(sort) ? sort : "custom",
  };
}

function updateUrl(filters: ProjectFilters) {
  const params = new URLSearchParams(window.location.search);
  ["q", "status", "category", "tag", "sort"].forEach((key) => params.delete(key));
  if (filters.query.trim()) params.set("q", filters.query.trim());
  if (filters.status !== "all") params.set("status", filters.status);
  if (filters.category !== "all") params.set("category", filters.category);
  if (filters.tag !== "all") params.set("tag", filters.tag);
  if (filters.sort !== "custom") params.set("sort", filters.sort);
  const query = params.toString();
  const nextUrl = `${window.location.pathname}${query ? `?${query}` : ""}${window.location.hash}`;
  window.history.replaceState(null, "", nextUrl);
}

function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return (
    target instanceof HTMLInputElement ||
    target instanceof HTMLTextAreaElement ||
    target instanceof HTMLSelectElement ||
    target.isContentEditable
  );
}

export function ProjectExplorer({ projects }: { projects: Project[] }) {
  const [filters, setFilters] = useState<ProjectFilters>(() =>
    filtersFromUrl(projects),
  );
  const [pendingProjectRepo, setPendingProjectRepo] = useState<string | null>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const categories = useMemo(
    () => uniqueValues(projects.map((project) => project.category)),
    [projects],
  );
  const tags = useMemo(
    () => uniqueValues(projects.flatMap((project) => project.tags)),
    [projects],
  );
  const results = useMemo(
    () => filterProjects(projects, filters),
    [projects, filters],
  );
  const isFiltered =
    filters.query !== "" ||
    filters.status !== "all" ||
    filters.category !== "all" ||
    filters.tag !== "all" ||
    filters.sort !== "custom";

  useEffect(() => {
    updateUrl(filters);
  }, [filters]);

  useEffect(() => {
    const handlePopState = () => setFilters(filtersFromUrl(projects));
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, [projects]);

  useEffect(() => {
    const handleProjectSelect = (event: Event) => {
      const { repo } = (event as CustomEvent<ProjectSelectDetail>).detail;
      setFilters((current) => {
        const isVisible = filterProjects(projects, current).some(
          (project) => project.repo === repo,
        );
        return isVisible
          ? current
          : { ...DEFAULT_FILTERS, sort: current.sort };
      });
      setPendingProjectRepo(repo);
    };
    window.addEventListener(PROJECT_SELECT_EVENT, handleProjectSelect);
    return () => window.removeEventListener(PROJECT_SELECT_EVENT, handleProjectSelect);
  }, [projects]);

  useEffect(() => {
    if (!pendingProjectRepo) return;
    const frame = window.requestAnimationFrame(() => {
      if (focusProjectCard(pendingProjectRepo)) setPendingProjectRepo(null);
    });
    return () => window.cancelAnimationFrame(frame);
  }, [pendingProjectRepo, results]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "/" && !isTypingTarget(event.target)) {
        event.preventDefault();
        searchRef.current?.focus();
        searchRef.current?.select();
      }
      if (event.key === "Escape" && filters.query) {
        setFilters((current) => ({ ...current, query: "" }));
        searchRef.current?.focus();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [filters.query]);

  const updateFilter = <Key extends keyof ProjectFilters>(
    key: Key,
    value: ProjectFilters[Key],
  ) => setFilters((current) => ({ ...current, [key]: value }));

  return (
    <section id="projects" className="section page-container" aria-labelledby="projects-title">
      <SectionHeading
        eyebrow="PROJECT ARCHIVE"
        title="전체 프로젝트 탐색기"
        description="이름과 설명으로 검색하거나 상태, 분야, 태그로 원하는 프로젝트를 골라보세요."
        id="projects-title"
      />

      <form className="filter-panel" role="search" onSubmit={(event) => event.preventDefault()}>
        <div className="filter-field filter-field--search">
          <label htmlFor="project-search">프로젝트 검색</label>
          <div className="search-input">
            <SearchIcon />
            <input
              ref={searchRef}
              id="project-search"
              type="search"
              value={filters.query}
              onChange={(event) => updateFilter("query", event.target.value)}
              placeholder="프로젝트명, 설명, 저장소 검색"
              autoComplete="off"
              aria-describedby="search-shortcut"
            />
            <kbd id="search-shortcut" aria-label="슬래시 키">/</kbd>
          </div>
        </div>

        <div className="filter-field">
          <label htmlFor="status-filter">상태</label>
          <div className="select-wrap">
            <select
              id="status-filter"
              value={filters.status}
              onChange={(event) =>
                updateFilter("status", event.target.value as ProjectStatus | "all")
              }
            >
              <option value="all">모든 상태</option>
              {(Object.keys(STATUS_LABELS) as ProjectStatus[]).map((status) => (
                <option key={status} value={status}>{STATUS_LABELS[status]}</option>
              ))}
            </select>
            <ChevronIcon />
          </div>
        </div>

        <div className="filter-field">
          <label htmlFor="category-filter">분류</label>
          <div className="select-wrap">
            <select
              id="category-filter"
              value={filters.category}
              onChange={(event) => updateFilter("category", event.target.value)}
            >
              <option value="all">모든 분류</option>
              {categories.map((category) => (
                <option key={category} value={category}>{category}</option>
              ))}
            </select>
            <ChevronIcon />
          </div>
        </div>

        <div className="filter-field">
          <label htmlFor="tag-filter">기술·태그</label>
          <div className="select-wrap">
            <select
              id="tag-filter"
              value={filters.tag}
              onChange={(event) => updateFilter("tag", event.target.value)}
            >
              <option value="all">모든 태그</option>
              {tags.map((tag) => (
                <option key={tag} value={tag}>{tag}</option>
              ))}
            </select>
            <ChevronIcon />
          </div>
        </div>

        <div className="filter-field">
          <label htmlFor="sort-filter">정렬</label>
          <div className="select-wrap">
            <select
              id="sort-filter"
              value={filters.sort}
              onChange={(event) => updateFilter("sort", event.target.value as ProjectSort)}
            >
              {(Object.keys(SORT_LABELS) as ProjectSort[]).map((sort) => (
                <option key={sort} value={sort}>{SORT_LABELS[sort]}</option>
              ))}
            </select>
            <ChevronIcon />
          </div>
        </div>
      </form>

      <div className="explorer-summary">
        <p role="status" aria-live="polite" aria-atomic="true">
          <strong>{results.length}</strong>개의 프로젝트를 찾았습니다.
        </p>
        <button
          type="button"
          className="reset-button"
          onClick={() => setFilters(DEFAULT_FILTERS)}
          disabled={!isFiltered}
        >
          <ResetIcon />
          필터 초기화
        </button>
      </div>

      {results.length > 0 ? (
        <div className="project-grid project-grid--all">
          {results.map((project) => (
            <ProjectCard key={project.repo} project={project} withAnchor />
          ))}
        </div>
      ) : (
        <div className="empty-state">
          <span className="empty-state__mark" aria-hidden="true" />
          <h3>이 좌표에는 아직 프로젝트가 없습니다.</h3>
          <p>검색어를 줄이거나 필터를 초기화해 다시 살펴보세요.</p>
          <button type="button" className="button button--quiet" onClick={() => setFilters(DEFAULT_FILTERS)}>
            전체 프로젝트 보기
          </button>
        </div>
      )}
    </section>
  );
}
