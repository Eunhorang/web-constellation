# 디자인 정교화 (Design Refinement) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 은호랑의 웹 별자리 사이트를 기존의 밝고 차분한 디자인 톤 안에서 타이포그래피·레이아웃·모션을 정교하게 다듬어 더 세련되고 프리미엄하게 보이도록 만든다.

**Architecture:** 순수 CSS 조정(타이포그래피, 그리드, hover, sticky)과, 두 개의 재사용 가능한 순수 함수(`formatCardIndex`, `computeMagneticOffset`) + 한 개의 재사용 가능한 스크롤 감지 훅(`useRevealOnScroll`)을 새로 만들어 기존 React 컴포넌트에 최소한으로 연결한다. 새 npm 패키지는 추가하지 않는다.

**Tech Stack:** React 19, TypeScript strict, Tailwind CSS 4 + 커스텀 CSS(`src/styles.css`), Vitest(`environment: "node"`).

## Global Constraints

- 사이트 배경 `#F4F2EC`, 표면 `#FAF9F5`, 글자 `#202522`, 포인트 `#66766A` 중심의 밝고 차분한 톤을 유지한다 — 다크 모드, 새 색상, 그라데이션 확대, 네온, glassmorphism(backdrop-filter blur 포함)을 추가하지 않는다.
- 새 npm 의존성을 추가하지 않는다. 애니메이션은 순수 CSS `transition`/`animation`과 브라우저 내장 `IntersectionObserver`, `matchMedia`만 사용한다.
- 모든 새 모션은 `prefers-reduced-motion: reduce`에서 비활성화되거나 즉시 완료 상태로 표시되어야 한다. 전역 규칙(`src/styles.css`의 `@media (prefers-reduced-motion: reduce)` 블록, 모든 요소의 transition/animation 지속시간을 0.01ms로 강제)이 이미 있으므로, JS 쪽에서도 `window.matchMedia("(prefers-reduced-motion: reduce)").matches`를 확인해 애니메이션을 아예 시작하지 않도록 이중으로 처리한다.
- 자바스크립트 실행 전(prerender된 정적 HTML)에도 모든 섹션과 프로젝트가 그대로 보여야 한다. 즉 "숨겨진 채 시작해서 나타나는" 요소의 기본 CSS 상태는 반드시 **보이는 상태**여야 하고, 숨김은 클라이언트에서 `useLayoutEffect`로 뷰포트 밖에 있는 요소에 한해서만 스크립트로 적용한다.
- 키보드 포커스(`:focus-visible`), `aria-label`, `skip-link`, `aria-live` 검색 결과 등 기존 접근성 장치를 변경하지 않는다. 새 인터랙션(마그네틱 호버)은 마우스 포인터 전용이며 키보드 포커스 동작에 영향을 주지 않는다.
- 360px, 390px, 768px, 1024px, 1440px 반응형 기준을 유지한다. 기존 미디어 쿼리 breakpoint(`67.5rem`, `56rem`, `47.99rem`, `30rem`)와 충돌하지 않게 새 규칙을 추가한다.
- 이 프로젝트는 컴포넌트/DOM 렌더링 테스트 도구(jsdom, `@testing-library/react` 등)를 쓰지 않는다(Vitest `environment: "node"`, 기존 테스트는 모두 순수 함수 테스트). 새로 추가하는 두 개의 순수 함수(`formatCardIndex`, `computeMagneticOffset`)만 Vitest로 테스트하고, DOM/모션에 의존하는 부분(`useRevealOnScroll` 훅, 스크롤/포인터 이벤트 배선)은 기존 관례(`SiteHeader`의 스크롤 리스너, `ConstellationMap`의 툴팁 토글처럼 단위 테스트 없이 `npm run dev` 육안 확인)를 따른다.
- 각 태스크 종료 시 최소 `npm run lint`와 `npm run typecheck`를 실행해 통과를 확인한다. 마지막 태스크(Task 9)에서 전체 검증(`test`, `build`, `check:build`)과 반응형/모션 육안 확인을 한 번에 수행한다.

---

### Task 1: 프로젝트 카드 인덱스 번호

**Files:**
- Modify: `src/lib/projects.ts` (새 함수 추가, 파일 끝)
- Modify: `tests/projects.test.ts` (새 `describe` 블록 추가, 파일 끝)
- Modify: `src/components/ProjectCard.tsx:11-42`
- Modify: `src/components/FeaturedProjects.tsx:16-20`
- Modify: `src/components/ProjectExplorer.tsx:343-345`
- Modify: `src/components/CurrentWork.tsx:19-23`
- Modify: `src/styles.css` (`.project-card__copy` 근처에 새 규칙 추가)

**Interfaces:**
- Produces: `formatCardIndex(position: number): string` — export from `src/lib/projects.ts`. `position`은 1부터 시작하는 순번, 반환값은 2자리 0-padding 문자열 (`1` → `"01"`, `12` → `"12"`).
- Produces: `ProjectCard`의 새 optional prop `index?: number` (1부터 시작하는 표시 순번). 이 prop이 주어지면 카드 제목 위에 작은 인덱스 텍스트를 렌더링한다.

- [ ] **Step 1: 실패하는 테스트 작성**

`tests/projects.test.ts` 파일 끝에 추가:

```ts
describe("카드 인덱스 표시", () => {
  it("한 자리 순번은 앞에 0을 붙이고 두 자리 이상은 그대로 쓴다", () => {
    expect(formatCardIndex(1)).toBe("01");
    expect(formatCardIndex(9)).toBe("09");
    expect(formatCardIndex(12)).toBe("12");
    expect(formatCardIndex(123)).toBe("123");
  });
});
```

파일 상단 import에 `formatCardIndex` 추가:

```ts
import {
  filterProjects,
  formatCardIndex,
  formatKoreanDate,
  formatKoreanDateTime,
  formatKoreanYear,
  getFeaturedProjects,
  mergeProjects,
  projectElementId,
  sortProjects,
} from "../src/lib/projects";
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `npm run test -- tests/projects.test.ts`
Expected: FAIL — `formatCardIndex` is not exported / not defined.

- [ ] **Step 3: 최소 구현 작성**

`src/lib/projects.ts` 파일 맨 끝(`formatKoreanYear` 함수 뒤)에 추가:

```ts
export function formatCardIndex(position: number): string {
  return String(position).padStart(2, "0");
}
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `npm run test -- tests/projects.test.ts`
Expected: PASS

- [ ] **Step 5: ProjectCard에 인덱스 표시 추가**

`src/components/ProjectCard.tsx`를 다음과 같이 수정한다.

import 문에 `formatCardIndex` 추가:

```tsx
import {
  formatCardIndex,
  formatKoreanDate,
  formatKoreanDateTime,
  projectElementId,
} from "@/lib/projects";
```

`ProjectCardProps` 인터페이스에 `index` 추가:

```tsx
interface ProjectCardProps {
  project: Project;
  variant?: "featured" | "standard" | "compact";
  withAnchor?: boolean;
  index?: number;
}
```

컴포넌트 매개변수와 `.project-card__copy` 블록을 수정:

```tsx
export const ProjectCard = memo(function ProjectCard({
  project,
  variant = "standard",
  withAnchor = false,
  index,
}: ProjectCardProps) {
  const latestUpdate = project.updateHistory[0];
  const previousUpdates = project.updateHistory.slice(1, 6);
  const hasMoreUpdates = project.updateHistory.length > 6;

  return (
    <article
      id={withAnchor ? projectElementId(project.repo) : undefined}
      className={`project-card project-card--${variant}`}
      style={{ "--project-accent": project.accent } as CSSProperties}
      tabIndex={withAnchor ? -1 : undefined}
    >
      <div className="project-card__topline">
        <StatusBadge status={project.status} />
        <span className="project-card__category">
          {project.sourceOnly ? "소스 프로젝트" : project.category}
        </span>
      </div>

      <div className="project-card__copy">
        {typeof index === "number" ? (
          <p className="project-card__index" aria-hidden="true">
            {formatCardIndex(index)}
          </p>
        ) : null}
        <h3>{project.title}</h3>
        <p>{project.description}</p>
      </div>
```

(나머지 JSX는 그대로 둔다.)

- [ ] **Step 6: 각 그리드에서 순번 전달**

`src/components/FeaturedProjects.tsx`의 렌더 부분을 수정:

```tsx
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
```

`src/components/ProjectExplorer.tsx`의 결과 렌더 부분(343번째 줄 근처)을 수정:

```tsx
<div id="project-results" className="project-grid project-grid--all">
  {visibleResults.map((project, index) => (
    <ProjectCard
      key={project.repo}
      project={project}
      withAnchor
      index={index + 1}
    />
  ))}
</div>
```

`src/components/CurrentWork.tsx`의 렌더 부분을 수정:

```tsx
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
```

- [ ] **Step 7: 인덱스 스타일 추가**

`src/styles.css`의 `.project-card__copy` 규칙(현재 858번째 줄 근처) 바로 뒤에 추가:

```css
.project-card__index {
  margin: 0 0 0.35rem;
  color: var(--project-accent);
  font-family: var(--font-display);
  font-size: 0.75rem;
  font-weight: 750;
  letter-spacing: 0.14em;
  font-variant-numeric: tabular-nums;
}
```

- [ ] **Step 8: 검증**

Run: `npm run lint && npm run typecheck && npm run test`
Expected: 모두 PASS.

Run: `npm run dev`, `http://localhost:5173` 접속 후 대표 프로젝트/전체 탐색기/제작 중 섹션 카드 제목 위에 `01`, `02`... 같은 작은 번호가 accent 색으로 보이는지 육안 확인.

- [ ] **Step 9: 커밋**

```bash
git add src/lib/projects.ts tests/projects.test.ts src/components/ProjectCard.tsx src/components/FeaturedProjects.tsx src/components/ProjectExplorer.tsx src/components/CurrentWork.tsx src/styles.css
git commit -m "feat: add subtle index numbers to project cards"
```

---

### Task 2: 대표 프로젝트 비대칭(bento) 그리드

**Files:**
- Modify: `src/styles.css` (`.project-grid--featured` 관련 규칙)

**Interfaces:**
- Consumes: 없음 (순수 CSS, 마크업/컴포넌트 변경 없음)

- [ ] **Step 1: 데스크톱 전용 비대칭 규칙 추가**

`src/styles.css`에서 `@media (max-width: 67.5rem)` 블록(현재 1389번째 줄 근처) **바로 앞**에 새 미디어 쿼리를 추가한다 (데스크톱 전용, 기존 좁은 화면 규칙보다 앞에 두되 `min-width`라 좁은 화면에는 적용되지 않는다):

```css
@media (min-width: 67.51rem) {
  .project-grid--featured > :first-child {
    grid-column: span 2;
  }
}
```

- [ ] **Step 2: 검증**

Run: `npm run lint && npm run typecheck && npm run build`
Expected: 모두 PASS.

Run: `npm run dev`, 1440px와 1024px 너비에서 대표 프로젝트 섹션의 첫 카드가 나머지보다 넓게(2배 폭) 보이는지, 768px 이하에서는 기존처럼 균등한 그리드로 돌아가는지 육안 확인.

- [ ] **Step 3: 커밋**

```bash
git add src/styles.css
git commit -m "style: give the first featured project card a wider bento layout"
```

---

### Task 3: 카드 hover 디테일 강화

**Files:**
- Modify: `src/styles.css` (`.project-card::before`, `.project-card:hover` 규칙, 현재 756-772번째 줄 근처)

**Interfaces:**
- Consumes: 없음 (순수 CSS)

- [ ] **Step 1: accent 바 hover 확장과 그림자 보강**

`src/styles.css`의 기존 규칙을 다음처럼 교체한다.

기존:

```css
.project-card::before {
  position: absolute;
  top: 0;
  right: 1.35rem;
  left: 1.35rem;
  height: 2px;
  border-radius: 0 0 99px 99px;
  background: var(--project-accent);
  content: "";
  opacity: 0.72;
}

.project-card:hover {
  border-color: rgb(32 37 34 / 22%);
  background: var(--surface);
  transform: translateY(-2px);
}
```

수정 후:

```css
.project-card::before {
  position: absolute;
  top: 0;
  right: 1.35rem;
  left: 1.35rem;
  height: 2px;
  border-radius: 0 0 99px 99px;
  background: var(--project-accent);
  content: "";
  opacity: 0.72;
  transition: right 220ms ease, left 220ms ease, opacity 220ms ease;
}

.project-card:hover {
  border-color: rgb(32 37 34 / 22%);
  background: var(--surface);
  box-shadow: 0 32px 70px -40px rgb(32 37 34 / 38%);
  transform: translateY(-3px);
}

.project-card:hover::before {
  right: 0.55rem;
  left: 0.55rem;
  opacity: 1;
}
```

- [ ] **Step 2: 검증**

Run: `npm run lint && npm run typecheck && npm run build`
Expected: 모두 PASS.

Run: `npm run dev`, 아무 프로젝트 카드에 마우스를 올렸을 때 상단 accent 언더라인이 살짝 넓어지고 그림자가 더 부드럽게 커지는지 확인. `prefers-reduced-motion: reduce` 상태(브라우저 개발자 도구의 렌더링 설정)에서도 오류 없이 즉시 전환되는지 확인.

- [ ] **Step 3: 커밋**

```bash
git add src/styles.css
git commit -m "style: deepen project card hover shadow and accent underline"
```

---

### Task 4: 히어로 타이포그래피 스케일 확대

**Files:**
- Modify: `src/styles.css` (`.hero h1`, `.hero-stats dd` 규칙)

**Interfaces:**
- Consumes: 없음 (순수 CSS)

스펙 문서에서 "가능하면 시도"로 남겨둔 스크롤 위치 기반 `font-variation-settings`(가변 굵기) 보간 효과는 이 태스크에서 구현하지 않는다. 복잡도와 성능 위험 대비 효과가 크지 않다고 판단했다 — 스펙에서도 필수 요구사항이 아니라 선택 사항으로 명시했다.

- [ ] **Step 1: 히어로 제목 크기 확대**

`src/styles.css`의 `.hero h1` 규칙(현재 308-317번째 줄)을 수정한다.

기존:

```css
.hero h1 {
  max-width: 12ch;
  margin: 0;
  font-family: var(--font-display);
  font-size: clamp(3rem, 6.5vw, 5.75rem);
  font-weight: 720;
  letter-spacing: -0.045em;
  line-height: 1.08;
  text-wrap: balance;
}
```

수정 후:

```css
.hero h1 {
  max-width: 12ch;
  margin: 0;
  font-family: var(--font-display);
  font-size: clamp(3.1rem, 7.4vw, 6.75rem);
  font-weight: 740;
  letter-spacing: -0.05em;
  line-height: 1.05;
  text-wrap: balance;
}
```

(이 규칙은 `@media (max-width: 56rem)`와 `@media (max-width: 30rem)`에서 별도의 `font-size` 값으로 다시 덮어써지므로 모바일 크기는 영향을 받지 않는다. 두 미디어 쿼리 블록은 그대로 둔다.)

- [ ] **Step 2: 통계 숫자 대비 강화**

`.hero-stats dd` 규칙(현재 502-510번째 줄)을 수정한다.

기존:

```css
.hero-stats dd {
  margin: 0.15rem 0 0;
  font-family: var(--font-display);
  font-size: 1.9rem;
  font-weight: 700;
  letter-spacing: -0.035em;
  line-height: 1.15;
  font-variant-numeric: tabular-nums;
}
```

수정 후:

```css
.hero-stats dd {
  margin: 0.15rem 0 0;
  font-family: var(--font-display);
  font-size: 2.15rem;
  font-weight: 760;
  letter-spacing: -0.04em;
  line-height: 1.12;
  font-variant-numeric: tabular-nums;
}
```

- [ ] **Step 3: 검증**

Run: `npm run lint && npm run typecheck && npm run build`
Expected: 모두 PASS.

Run: `npm run dev`, 1440px/1024px/768px/390px/360px에서 히어로 제목과 통계 숫자가 잘리거나 줄바꿈이 어색해지지 않는지, 가로 스크롤이 생기지 않는지 육안 확인.

- [ ] **Step 4: 커밋**

```bash
git add src/styles.css
git commit -m "style: scale up hero headline and stat numerals for more presence"
```

---

### Task 5: 필터 패널 sticky 처리

**Files:**
- Modify: `src/styles.css` (`:root` 변수, `.filter-panel` 관련 규칙)

**Interfaces:**
- Consumes: 없음 (순수 CSS)

- [ ] **Step 1: 헤더 높이 변수 추가**

`src/styles.css`의 `:root` 블록(현재 3-26번째 줄) 안, `--radius-large` 아래에 추가:

```css
  --header-height: 4.5rem;
```

- [ ] **Step 2: 데스크톱 전용 sticky 규칙 추가**

`.filter-panel` 규칙(현재 1056-1064번째 줄) 바로 뒤에 새 미디어 쿼리를 추가한다:

```css
@media (min-width: 48rem) {
  .filter-panel {
    position: sticky;
    top: calc(var(--header-height) + 0.85rem);
    z-index: 40;
    background: rgb(250 249 245 / 94%);
  }
}
```

(`48rem`은 기존 `.menu-button`/`.primary-navigation` 모바일 전환 기준(`47.99rem`)과 짝을 이루는 값으로, 모바일 메뉴가 데스크톱 내비게이션으로 바뀌는 지점 이상에서만 sticky를 적용한다.)

- [ ] **Step 3: 검증**

Run: `npm run lint && npm run typecheck && npm run build`
Expected: 모두 PASS.

Run: `npm run dev`, 데스크톱 너비(≥768px)에서 전체 프로젝트 탐색기 섹션을 스크롤할 때 필터 패널이 헤더 바로 아래에 고정되고 헤더와 겹치지 않는지 확인. 모바일 너비(390px, 360px)에서는 필터 패널이 고정되지 않고 원래 위치에 그대로 스크롤되는지 확인.

- [ ] **Step 4: 커밋**

```bash
git add src/styles.css
git commit -m "style: keep the filter panel sticky under the header on desktop"
```

---

### Task 6: 별자리 노드 마그네틱 호버

**Files:**
- Modify: `src/lib/constellation.ts` (새 함수 추가, 파일 끝)
- Create: `tests/constellation.test.ts`
- Modify: `src/components/ConstellationMap.tsx`
- Modify: `src/styles.css` (`.constellation-node__button` 규칙)

**Interfaces:**
- Produces: `computeMagneticOffset(pointer: { x: number; y: number }, center: { x: number; y: number }, maxOffset: number): { x: number; y: number }` — export from `src/lib/constellation.ts`. 커서가 노드 중심에서 멀수록 최대 `maxOffset`(px)까지, 가까울수록 그 거리에 비례해 더 작게 끌리는 오프셋을 계산하는 순수 함수.

- [ ] **Step 1: 실패하는 테스트 작성**

`tests/constellation.test.ts` 새로 생성:

```ts
import { describe, expect, it } from "vitest";
import { computeMagneticOffset } from "../src/lib/constellation";

describe("별자리 노드 마그네틱 호버 오프셋", () => {
  it("커서가 중심과 정확히 겹치면 오프셋이 없다", () => {
    expect(
      computeMagneticOffset({ x: 100, y: 100 }, { x: 100, y: 100 }, 4),
    ).toEqual({ x: 0, y: 0 });
  });

  it("커서가 멀리 있어도 오프셋 크기는 maxOffset을 넘지 않는다", () => {
    const offset = computeMagneticOffset(
      { x: 1000, y: 100 },
      { x: 0, y: 100 },
      4,
    );
    expect(Math.hypot(offset.x, offset.y)).toBeCloseTo(4, 5);
    expect(offset.x).toBeGreaterThan(0);
    expect(offset.y).toBeCloseTo(0, 5);
  });

  it("커서가 가까이 있으면 거리에 비례해 작은 오프셋을 돌려준다", () => {
    const offset = computeMagneticOffset(
      { x: 10, y: 0 },
      { x: 0, y: 0 },
      4,
    );
    // distance(10) < maxOffset / strength(4 / 0.35 ≈ 11.43) 이므로 비례 구간
    expect(offset.x).toBeCloseTo(3.5, 5);
    expect(offset.y).toBe(0);
  });
});
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `npm run test -- tests/constellation.test.ts`
Expected: FAIL — `computeMagneticOffset` is not exported / not defined.

- [ ] **Step 3: 최소 구현 작성**

`src/lib/constellation.ts` 파일 맨 끝에 추가:

```ts
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
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `npm run test -- tests/constellation.test.ts`
Expected: PASS

- [ ] **Step 5: ConstellationMap에 마그네틱 호버 배선**

`src/components/ConstellationMap.tsx` 상단 import를 수정:

```tsx
import { useEffect, useMemo, useRef, useState, type CSSProperties, type PointerEvent } from "react";
import { SectionHeading } from "./Common";
import { buildConstellation, computeMagneticOffset } from "@/lib/constellation";
import { requestProjectCard } from "@/lib/project-navigation";
import { projectIdToken, STATUS_LABELS } from "@/lib/projects";
import type { Project } from "@/types/project";
```

컴포넌트 본문에서 기존 state 선언들 아래에 추가:

```tsx
const [magnetOffset, setMagnetOffset] = useState<
  { repo: string; x: number; y: number } | null
>(null);
const reducedMotionRef = useRef(false);

useEffect(() => {
  const query = window.matchMedia("(prefers-reduced-motion: reduce)");
  const updatePreference = () => {
    reducedMotionRef.current = query.matches;
  };
  updatePreference();
  query.addEventListener("change", updatePreference);
  return () => query.removeEventListener("change", updatePreference);
}, []);

const handleNodePointerMove =
  (repo: string) => (event: PointerEvent<HTMLButtonElement>) => {
    if (reducedMotionRef.current || event.pointerType !== "mouse") return;
    const rect = event.currentTarget.getBoundingClientRect();
    const center = { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
    const offset = computeMagneticOffset(
      { x: event.clientX, y: event.clientY },
      center,
      4,
    );
    setMagnetOffset({ repo, x: offset.x, y: offset.y });
  };

const clearMagnetOffset = (repo: string) => {
  setMagnetOffset((current) => (current?.repo === repo ? null : current));
};
```

`<button className="constellation-node__button" ...>` 태그에 `onPointerMove`, `onPointerLeave`(기존 `setHoveredRepo(null)` 호출부에 `clearMagnetOffset` 추가), `style` 속성을 추가한다. 기존:

```tsx
<button
  type="button"
  className="constellation-node__button"
  data-featured={node.project.featured}
  data-tooltip-side={node.tooltipSide}
  data-tooltip-visible={tooltipVisible}
  onClick={() => requestProjectCard(node.project.repo)}
  onPointerEnter={() => setHoveredRepo(node.project.repo)}
  onPointerLeave={() => setHoveredRepo(null)}
  onFocus={() => setFocusedRepo(node.project.repo)}
  onBlur={() => setFocusedRepo(null)}
  aria-label={`${node.project.title}, ${node.project.category}, ${STATUS_LABELS[node.project.status]} — 프로젝트 카드로 이동`}
  aria-describedby={descriptionId}
>
```

수정 후:

```tsx
<button
  type="button"
  className="constellation-node__button"
  data-featured={node.project.featured}
  data-tooltip-side={node.tooltipSide}
  data-tooltip-visible={tooltipVisible}
  style={
    magnetOffset?.repo === node.project.repo
      ? {
          transform: `translate(${magnetOffset.x}px, ${magnetOffset.y}px)`,
        }
      : undefined
  }
  onClick={() => requestProjectCard(node.project.repo)}
  onPointerEnter={() => setHoveredRepo(node.project.repo)}
  onPointerMove={handleNodePointerMove(node.project.repo)}
  onPointerLeave={() => {
    setHoveredRepo(null);
    clearMagnetOffset(node.project.repo);
  }}
  onFocus={() => setFocusedRepo(node.project.repo)}
  onBlur={() => setFocusedRepo(null)}
  aria-label={`${node.project.title}, ${node.project.category}, ${STATUS_LABELS[node.project.status]} — 프로젝트 카드로 이동`}
  aria-describedby={descriptionId}
>
```

- [ ] **Step 6: 부드러운 전환을 위한 CSS 추가**

`.constellation-node__button` 규칙(현재 592-603번째 줄)에 `transition` 한 줄을 추가한다.

기존:

```css
.constellation-node__button {
  position: relative;
  display: grid;
  width: 2.75rem;
  height: 2.75rem;
  padding: 0;
  place-items: center;
  border: 0;
  border-radius: 50%;
  background: transparent;
  cursor: pointer;
}
```

수정 후:

```css
.constellation-node__button {
  position: relative;
  display: grid;
  width: 2.75rem;
  height: 2.75rem;
  padding: 0;
  place-items: center;
  border: 0;
  border-radius: 50%;
  background: transparent;
  cursor: pointer;
  transition: transform 160ms ease;
}
```

(전역 `@media (prefers-reduced-motion: reduce)` 규칙이 이미 모든 요소의 `transition-duration`을 0.01ms로 강제하므로 별도 처리가 필요 없다.)

- [ ] **Step 7: 검증**

Run: `npm run lint && npm run typecheck && npm run test`
Expected: 모두 PASS.

Run: `npm run dev`, 데스크톱에서 마우스를 별자리 노드 근처로 가져갔을 때 노드가 커서 쪽으로 아주 살짝 끌리는지, 마우스가 멀어지면 원래 자리로 돌아오는지 확인. `Tab` 키로 노드에 포커스했을 때는 마그네틱 효과 없이 기존 포커스 링만 나타나는지 확인. 모바일(터치)에서는 효과가 나타나지 않는지 확인.

- [ ] **Step 8: 커밋**

```bash
git add src/lib/constellation.ts tests/constellation.test.ts src/components/ConstellationMap.tsx src/styles.css
git commit -m "feat: add subtle magnetic pointer hover to constellation nodes"
```

---

### Task 7: 공용 스크롤 reveal 훅과 5개 섹션 적용

**Files:**
- Create: `src/lib/use-reveal-on-scroll.ts`
- Modify: `src/components/Hero.tsx`
- Modify: `src/components/FeaturedProjects.tsx`
- Modify: `src/components/ProjectExplorer.tsx`
- Modify: `src/components/CurrentWork.tsx`
- Modify: `src/components/About.tsx`
- Modify: `src/styles.css` (새 `.reveal-pending`/`.reveal-in` 규칙)

**Interfaces:**
- Produces: `useRevealOnScroll<T extends Element>(): { ref: RefObject<T | null>; className: string }` — export from `src/lib/use-reveal-on-scroll.ts`. `className`은 `""`(기본, 항상 보임), `"reveal-pending"`(뷰포트 밖이라 숨겨진 상태), `"reveal-in"`(뷰포트에 들어와 애니메이션 중/완료) 중 하나.
- Consumes(Task 6에서 만든 패턴과 동일한 원칙): `window.matchMedia("(prefers-reduced-motion: reduce)")`.

이 훅은 브라우저 DOM(`IntersectionObserver`, `getBoundingClientRect`, `matchMedia`)에 의존하므로 Vitest(`environment: "node"`)로 단위 테스트하지 않는다. `npm run dev`로 육안 확인한다 (Global Constraints 참고).

- [ ] **Step 1: 훅 작성**

`src/lib/use-reveal-on-scroll.ts` 새로 생성:

```ts
import { useLayoutEffect, useRef, useState, type RefObject } from "react";

type RevealState = "visible" | "pending" | "revealed";

export function useRevealOnScroll<T extends Element>(): {
  ref: RefObject<T | null>;
  className: string;
} {
  const ref = useRef<T | null>(null);
  const [state, setState] = useState<RevealState>("visible");

  useLayoutEffect(() => {
    const node = ref.current;
    if (!node) return;
    if (
      typeof IntersectionObserver === "undefined" ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      return;
    }

    const rect = node.getBoundingClientRect();
    const alreadyVisible = rect.top < window.innerHeight && rect.bottom > 0;
    if (alreadyVisible) return;

    setState("pending");
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setState("revealed");
          observer.disconnect();
        }
      },
      { threshold: 0.2 },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  const className =
    state === "pending" ? "reveal-pending" : state === "revealed" ? "reveal-in" : "";

  return { ref, className };
}
```

- [ ] **Step 2: CSS 규칙 추가**

`src/styles.css`의 `@media (prefers-reduced-motion: reduce)` 블록(현재 1675-1684번째 줄) 바로 앞에 추가:

```css
.reveal-pending {
  opacity: 0;
  transform: translateY(0.75rem);
}

.reveal-in {
  animation: reveal-in 620ms ease forwards;
}

@keyframes reveal-in {
  from {
    opacity: 0;
    transform: translateY(0.75rem);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
```

- [ ] **Step 3: Hero에 적용**

`src/components/Hero.tsx` import에 추가:

```tsx
import { useRevealOnScroll } from "@/lib/use-reveal-on-scroll";
```

컴포넌트 본문 시작 부분에 추가하고 `<section>` 태그를 수정:

```tsx
export function Hero({
  englishLabel,
  siteName,
  tagline,
  description,
  totalCount,
  liveCount,
  generatedAt,
  githubUrl,
}: HeroProps) {
  const { ref, className } = useRevealOnScroll<HTMLElement>();

  return (
    <section
      ref={ref}
      className={`hero page-container${className ? ` ${className}` : ""}`}
      aria-labelledby="hero-title"
    >
```

- [ ] **Step 4: FeaturedProjects에 적용**

`src/components/FeaturedProjects.tsx` import에 추가:

```tsx
import { useRevealOnScroll } from "@/lib/use-reveal-on-scroll";
```

```tsx
export function FeaturedProjects({ projects }: { projects: Project[] }) {
  const { ref, className } = useRevealOnScroll<HTMLElement>();
  if (projects.length === 0) return null;

  return (
    <section
      ref={ref}
      className={`section page-container${className ? ` ${className}` : ""}`}
      aria-labelledby="featured-title"
    >
```

(주의: `useRevealOnScroll` 훅 호출은 `if (projects.length === 0) return null;`보다 **먼저** 와야 한다 — React 훅은 조건부 return 이전에 호출해야 한다.)

- [ ] **Step 5: ProjectExplorer에 적용**

`src/components/ProjectExplorer.tsx` import에 추가:

```tsx
import { useRevealOnScroll } from "@/lib/use-reveal-on-scroll";
```

`ProjectExplorer` 컴포넌트 본문 맨 위, 기존 `useState`/`useRef` 선언들과 함께 추가:

```tsx
const { ref: sectionRef, className: revealClassName } = useRevealOnScroll<HTMLElement>();
```

`<section id="projects" ...>` 태그를 수정:

```tsx
<section
  id="projects"
  ref={sectionRef}
  className={`section page-container${revealClassName ? ` ${revealClassName}` : ""}`}
  aria-labelledby="projects-title"
>
```

- [ ] **Step 6: CurrentWork에 적용**

`src/components/CurrentWork.tsx` import에 추가:

```tsx
import { useRevealOnScroll } from "@/lib/use-reveal-on-scroll";
```

```tsx
export function CurrentWork({ projects }: { projects: Project[] }) {
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
```

- [ ] **Step 7: About에 적용**

`src/components/About.tsx` import에 추가:

```tsx
import { useRevealOnScroll } from "@/lib/use-reveal-on-scroll";
```

```tsx
export function About({ config }: { config: SiteConfig }) {
  const { ref, className } = useRevealOnScroll<HTMLElement>();
  const githubUrl = `https://github.com/${config.githubUsername}`;

  return (
    <section
      id="about"
      ref={ref}
      className={`section page-container${className ? ` ${className}` : ""}`}
      aria-labelledby="about-title"
    >
```

- [ ] **Step 8: 검증**

Run: `npm run lint && npm run typecheck && npm run test && npm run build`
Expected: 모두 PASS.

Run: `npm run dev`. 페이지 첫 로드 시 히어로는 애니메이션 없이 바로 보이고(이미 화면 안에 있으므로), 아래로 스크롤하면서 대표 프로젝트·탐색기·제작 중·소개 섹션이 각각 처음 화면에 들어올 때 살짝 아래에서 위로 떠오르듯 나타나는지 확인. 새로고침 없이 브라우저 뒤로/앞으로 가기, 검색 후에도 오류가 없는지 확인. `prefers-reduced-motion: reduce`에서는 모든 섹션이 항상 그대로 보이는지 확인. 페이지 소스 보기(`view-source:`)로 JS 실행 전 HTML에도 모든 섹션 텍스트가 그대로 들어있는지 확인(prerender 유지).

- [ ] **Step 9: 커밋**

```bash
git add src/lib/use-reveal-on-scroll.ts src/components/Hero.tsx src/components/FeaturedProjects.tsx src/components/ProjectExplorer.tsx src/components/CurrentWork.tsx src/components/About.tsx src/styles.css
git commit -m "feat: reveal below-the-fold sections with a subtle scroll-in transition"
```

---

### Task 8: 별자리 지도 섹션 reveal + 연결선 순차 등장

**Files:**
- Modify: `src/components/ConstellationMap.tsx`
- Modify: `src/styles.css` (`.constellation__lines line` 규칙)

**Interfaces:**
- Consumes: `useRevealOnScroll` (Task 7에서 생성).

- [ ] **Step 1: 섹션에 reveal 훅 적용**

`src/components/ConstellationMap.tsx` import에 추가:

```tsx
import { useRevealOnScroll } from "@/lib/use-reveal-on-scroll";
```

컴포넌트 본문에서 기존 state 선언들과 함께 추가:

```tsx
const { ref: sectionRef, className: revealClassName } = useRevealOnScroll<HTMLElement>();
```

`<section id="map" ...>` 태그를 수정:

```tsx
<section
  id="map"
  ref={sectionRef}
  className={`section page-container${revealClassName ? ` ${revealClassName}` : ""}`}
  aria-labelledby="map-title"
>
```

- [ ] **Step 2: 연결선에 순번 기반 지연 시간 추가**

`constellation.edges.map((edge) => (...))` 부분을 인덱스를 받도록 수정:

```tsx
{constellation.edges.map((edge, edgeIndex) => (
  <line
    key={`${edge.from.project.repo}-${edge.to.project.repo}`}
    x1={edge.from.x}
    y1={edge.from.y}
    x2={edge.to.x}
    y2={edge.to.y}
    style={{ animationDelay: `${edgeIndex * 70}ms` }}
  />
))}
```

- [ ] **Step 3: CSS로 순차 등장 처리**

`src/styles.css`의 `.constellation__lines line` 규칙(현재 570-575번째 줄)을 수정한다.

기존:

```css
.constellation__lines line {
  stroke: rgb(102 118 106 / 24%);
  stroke-dasharray: 3 5;
  stroke-width: 1;
  vector-effect: non-scaling-stroke;
}
```

수정 후:

```css
.constellation__lines line {
  stroke: rgb(102 118 106 / 24%);
  stroke-dasharray: 3 5;
  stroke-width: 1;
  vector-effect: non-scaling-stroke;
  opacity: 1;
}

.reveal-pending .constellation__lines line {
  opacity: 0;
}

.reveal-in .constellation__lines line {
  animation: line-fade-in 520ms ease forwards;
}

@keyframes line-fade-in {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}
```

(연결선 고유의 점선 패턴(`stroke-dasharray: 3 5`)은 그대로 유지하고, `stroke-dashoffset` 기반의 "그려지는" 효과 대신 순번별 지연이 있는 페이드인으로 구현한다 — `preserveAspectRatio="none"`으로 비율이 왜곡되는 SVG에서 `pathLength` 트릭을 쓰면 기존 점선 패턴이 깨지기 때문이다. 기본 상태는 `opacity: 1`이라 자바스크립트 실행 전에도 선이 그대로 보인다.)

- [ ] **Step 4: 검증**

Run: `npm run lint && npm run typecheck && npm run test && npm run build`
Expected: 모두 PASS.

Run: `npm run dev`. 별자리 지도 섹션이 처음 화면에 들어올 때 연결선들이 순서대로(약간의 시차를 두고) 옅게 나타나는지, 이미 그려진 뒤에는 다시 사라지지 않는지 확인. 모바일 너비(768px 미만)에서는 선 자체가 기존처럼 숨겨져 있어 영향이 없는지 확인. `prefers-reduced-motion: reduce`에서는 선이 항상 바로 보이는지 확인.

- [ ] **Step 5: 커밋**

```bash
git add src/components/ConstellationMap.tsx src/styles.css
git commit -m "feat: fade in constellation lines in sequence when the map scrolls into view"
```

---

### Task 9: 전체 검증, 반응형/모션 최종 확인, GitHub 반영

**Files:** 없음 (검증 및 배포 전용 태스크)

- [ ] **Step 1: 전체 자동 검사**

```bash
npm run lint
npm run typecheck
npm run test
npm run build
npm run check:build
```

Expected: 다섯 명령 모두 오류 없이 통과.

- [ ] **Step 2: 반응형 육안 확인**

Run: `npm run dev` (또는 `npm run preview`로 프로덕션 빌드 확인). 브라우저 개발자 도구로 너비를 360px, 390px, 768px, 1024px, 1440px로 바꾸며 다음을 확인한다.

- 가로 스크롤이 생기지 않는다.
- 히어로 제목과 통계 숫자가 어느 너비에서도 잘리지 않는다.
- 대표 프로젝트 bento 레이아웃이 1024px 이상에서만 나타나고 그 아래는 기존처럼 균등 그리드다.
- 필터 패널이 768px 이상에서만 스크롤 시 고정되고, 그 아래 너비에서는 고정되지 않는다.
- 모든 프로젝트 카드에 작은 인덱스 번호가 보인다.

- [ ] **Step 3: 모션/접근성 최종 확인**

- 키보드만으로 메뉴, 별자리 노드, 검색창, 필터, 카드, 링크를 모두 조작할 수 있는지 확인한다.
- 브라우저 개발자 도구에서 "모션 줄이기(prefers-reduced-motion: reduce)"를 켠 상태로 새로고침해 모든 새 애니메이션(카드 hover, 마그네틱 호버, 섹션 reveal, 연결선 페이드인)이 즉시 최종 상태로 보이는지 확인한다.
- Console에 오류가 없는지 확인한다.
- `view-source:http://localhost:5173/`(또는 `npm run preview` 주소)로 자바스크립트 실행 전 HTML에도 모든 섹션 제목과 프로젝트 카드 텍스트가 들어있는지 확인한다.

- [ ] **Step 4: 남은 변경 사항 커밋(있는 경우)**

Task 1~8을 진행하며 이미 각 단계에서 커밋했다면 이 단계는 생략한다. 육안 확인 중 발견한 사소한 수정 사항이 있다면 이 시점에 정리해 커밋한다.

```bash
git status
```

- [ ] **Step 5: GitHub에 반영**

사용자가 처음 요청에서 "깃허브에도 올려달라"고 명시했으므로, 로컬 `main` 브랜치를 원격 `origin/main`으로 push한다.

```bash
git push origin main
```

Expected: push 성공. GitHub Actions의 `Deploy to GitHub Pages` 워크플로가 자동으로 실행된다 (`.github/workflows/deploy-pages.yml`).

- [ ] **Step 6: 배포 확인**

```bash
gh run list --workflow=deploy-pages.yml --limit 1
```

가장 최근 실행이 성공(`completed`, `success`)했는지 확인하고, `https://eunhorang.github.io/web-constellation/`에 접속해 실제 배포 사이트에서 변경 사항이 반영되었는지 확인한다.
