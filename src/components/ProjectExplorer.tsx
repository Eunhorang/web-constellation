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
const RESULTS_PAGE_SIZE = 12;

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

function resultAnnouncement(filters: ProjectFilters, resultCount: number): string {
  const context: string[] = [];
  if (filters.query.trim()) context.push(`“${filters.query.trim()}” 검색`);
  if (filters.status !== "all") context.push(STATUS_LABELS[filters.status]);
  if (filters.category !== "all") context.push(`${filters.category} 분류`);
  if (filters.tag !== "all") context.push(`${filters.tag} 태그`);
  context.push(SORT_LABELS[filters.sort]);
  return `${context.join(", ")}: ${resultCount}개 프로젝트`;
}

export function ProjectExplorer({ projects }: { projects: Project[] }) {
  // 서버가 미리 만든 HTML과 첫 화면을 같게 유지한 뒤, 주소의 필터를 적용합니다.
  const [filters, setFilters] = useState<ProjectFilters>(DEFAULT_FILTERS);
  const [urlReady, setUrlReady] = useState(false);
  const [visibleCount, setVisibleCount] = useState(RESULTS_PAGE_SIZE);
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
  const visibleResults = useMemo(
    () => results.slice(0, visibleCount),
    [results, visibleCount],
  );
  const remainingCount = Math.max(0, results.length - visibleResults.length);
  const announcement = useMemo(
    () => resultAnnouncement(filters, results.length),
    [filters, results.length],
  );
  const isFiltered =
    filters.query.trim() !== "" ||
    filters.status !== "all" ||
    filters.category !== "all" ||
    filters.tag !== "all" ||
    filters.sort !== "custom";

  useEffect(() => {
    setFilters(filtersFromUrl(projects));
    setVisibleCount(RESULTS_PAGE_SIZE);
    setUrlReady(true);
  }, [projects]);

  useEffect(() => {
    if (urlReady) updateUrl(filters);
  }, [filters, urlReady]);

  useEffect(() => {
    const handlePopState = () => {
      setFilters(filtersFromUrl(projects));
      setVisibleCount(RESULTS_PAGE_SIZE);
    };
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
    const projectIndex = results.findIndex(
      (project) => project.repo === pendingProjectRepo,
    );
    if (projectIndex < 0) return;
    if (projectIndex >= visibleCount) {
      setVisibleCount(projectIndex + 1);
      return;
    }
    const frame = window.requestAnimationFrame(() => {
      if (focusProjectCard(pendingProjectRepo)) setPendingProjectRepo(null);
    });
    return () => window.cancelAnimationFrame(frame);
  }, [pendingProjectRepo, results, visibleCount]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const isSearchShortcut =
        (event.metaKey || event.ctrlKey) &&
        !event.altKey &&
        !event.shiftKey &&
        event.key.toLocaleLowerCase("en-US") === "k";
      if (isSearchShortcut && !isTypingTarget(event.target)) {
        event.preventDefault();
        searchRef.current?.focus();
        searchRef.current?.select();
      }
      const canClearSearch =
        event.target === searchRef.current || !isTypingTarget(event.target);
      if (
        event.key === "Escape" &&
        filters.query &&
        !event.defaultPrevented &&
        canClearSearch
      ) {
        event.preventDefault();
        setFilters((current) => ({ ...current, query: "" }));
        setVisibleCount(RESULTS_PAGE_SIZE);
        searchRef.current?.focus();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [filters.query]);

  const updateFilter = <Key extends keyof ProjectFilters>(
    key: Key,
    value: ProjectFilters[Key],
  ) => {
    setFilters((current) => ({ ...current, [key]: value }));
    setVisibleCount(RESULTS_PAGE_SIZE);
  };

  const resetFilters = () => {
    setFilters(DEFAULT_FILTERS);
    setVisibleCount(RESULTS_PAGE_SIZE);
  };

  const showMoreProjects = () => {
    const firstNewProject = results[visibleCount];
    setVisibleCount((current) =>
      Math.min(current + RESULTS_PAGE_SIZE, results.length),
    );
    if (firstNewProject) setPendingProjectRepo(firstNewProject.repo);
  };

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
              aria-keyshortcuts="Meta+K Control+K"
              aria-describedby="search-shortcut"
            />
            <kbd id="search-shortcut" aria-label="Command 또는 Control과 K 키">⌘K</kbd>
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
        <p aria-hidden="true">
          <strong>{results.length}</strong>개의 프로젝트를 찾았습니다.
        </p>
        <p className="sr-only" role="status" aria-live="polite" aria-atomic="true">
          {announcement}
        </p>
        <button
          type="button"
          className="reset-button"
          onClick={resetFilters}
          disabled={!isFiltered}
        >
          <ResetIcon />
          필터 초기화
        </button>
      </div>

      {results.length > 0 ? (
        <>
          <div id="project-results" className="project-grid project-grid--all">
            {visibleResults.map((project) => (
              <ProjectCard key={project.repo} project={project} withAnchor />
            ))}
          </div>
          {remainingCount > 0 ? (
            <div className="load-more">
              <button
                type="button"
                className="button button--quiet"
                onClick={showMoreProjects}
                aria-controls="project-results"
              >
                프로젝트 더 보기
                <span>{Math.min(RESULTS_PAGE_SIZE, remainingCount)}개</span>
              </button>
              <p>전체 {results.length}개 중 {visibleResults.length}개를 표시했습니다.</p>
            </div>
          ) : null}
        </>
      ) : (
        <div className="empty-state">
          <span className="empty-state__mark" aria-hidden="true" />
          <h3>이 좌표에는 아직 프로젝트가 없습니다.</h3>
          <p>검색어를 줄이거나 필터를 초기화해 다시 살펴보세요.</p>
          <button type="button" className="button button--quiet" onClick={resetFilters}>
            전체 프로젝트 보기
          </button>
        </div>
      )}
    </section>
  );
}
