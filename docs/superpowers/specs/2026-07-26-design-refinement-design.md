# 은호랑의 웹 별자리 — 디자인 정교화 스펙

## 배경과 목표

현재 사이트는 밝고 차분한 "종이 위 별자리" 톤(paper-based, sage green accent)을 갖추고 있고, `AGENTS.md`에 이 톤을 유지하고 무거운 그라데이션·네온·글래스모피즘·전체 화면 파티클 애니메이션을 금지한다는 원칙이 명시돼 있다.

사용자는 사이트가 "더 미래지향적이고 세련되게" 보이길 원한다. 사용자와 논의한 결과, 다음 방향으로 합의했다:

- 기존의 밝고 차분한 톤(색상, 접근성, 반응형 원칙)은 유지한다.
- 세련됨은 색상이나 다크 테마 전환이 아니라 **타이포그래피, 레이아웃 리듬, 모션의 정교함**으로 만든다.
- 새 npm 의존성은 추가하지 않는다. 기존 CSS/React 패턴만 사용한다.

이 스펙은 `AGENTS.md`의 디자인 원칙을 개정하지 않고, 그 안에서 세련됨을 끌어올리는 구체적인 변경 사항을 정의한다.

## 범위에 포함되는 것

1. 타이포그래피 스케일과 히어로 제목 처리
2. 대표 프로젝트(FeaturedProjects) 그리드를 비대칭(bento) 레이아웃으로 개편
3. 프로젝트 카드에 인덱스 번호와 accent 언더라인 추가
4. 필터 패널의 sticky 동작 개선
5. 별자리 지도(ConstellationMap) 진입 시 선 그리기 애니메이션
6. 별자리 노드의 "마그네틱 호버" 인터랙션
7. 섹션 스크롤 reveal 애니메이션 (IntersectionObserver 기반)
8. 카드 hover 시 그림자/accent 디테일 보강

## 범위에 포함되지 않는 것 (Out of scope)

- 다크 모드, 새 색상 팔레트, 그라데이션/네온/글래스모피즘 도입 — 사용자가 명시적으로 "차분한 톤 유지"를 선택했다.
- 새 npm 패키지 설치 (애니메이션 라이브러리 등).
- `project-overrides.json`, `site-config.json` 등 데이터 구조 변경.
- GitHub 동기화 로직, 프리렌더 스크립트, 보안 검사 스크립트 변경 (이 부분은 이미 별도 커밋으로 처리됨).
- `AGENTS.md`의 디자인 금지 원칙 자체를 수정하는 것.

## 상세 설계

### 1. 타이포그래피

- `.hero h1`의 `font-size`, `letter-spacing` 클램프 값을 키워 더 강한 존재감을 준다 (현재 `clamp(3rem, 6.5vw, 5.75rem)` → 상한을 넉넉히 올리는 방향, 실제 수치는 구현 중 반응형 테스트로 확정).
- Pretendard Variable의 `font-variation-settings` (`wght` 축)을 스크롤 위치에 따라 아주 미묘하게(예: 720 → 740 사이) 보간하는 선택적 효과를 히어로 제목에 한정해 검토한다. 성능/가독성에 부정적이면 생략 가능 — 필수 요구사항이 아니라 "가능하면 시도" 항목이다.
- `hero-stats dd` 같은 숫자 통계에 `font-variant-numeric: tabular-nums`는 유지하되, 대비를 위해 폰트 굵기/크기 단계를 한 단계 더 분리한다.

### 2. 대표 프로젝트 비대칭 그리드

- 현재 `.project-grid--featured`는 균등 3열이다. 첫 번째(대표) 카드를 2배 폭 또는 2배 높이로 키우는 bento 스타일로 변경한다.
- 데스크톱(≥56rem)에서만 비대칭을 적용하고, 그 아래에서는 기존 반응형 규칙(2열 → 1열)을 그대로 따른다. 실제 구현에서는 기존 `max-width: 56rem` 규칙과 겹치지 않도록 `min-width: 56.01rem`을 기준으로 삼는다.
- 데이터/컴포넌트 구조는 변경하지 않는다. CSS grid 배치만 바꾼다.

### 3. 프로젝트 카드 인덱스 번호 & accent 언더라인

- 각 카드 좌상단에 얇고 낮은 대비의 2자리 인덱스(`01`, `02`, ...)를 표시한다. 시각적 장식이며 스크린리더에는 `aria-hidden="true"`로 숨긴다 (별자리 지도의 `constellation-node__index`와 동일한 패턴).
- 카드 상단의 accent 바(`.project-card::before`)를 hover 시 폭이 살짝 넓어지는 언더라인으로 강화한다.

### 4. 필터 패널 sticky 개선

- `.filter-panel`을 프로젝트 탐색 섹션 스크롤 시 헤더 아래에 sticky로 고정하되, 헤더와 겹치지 않도록 `top` 값을 헤더 높이에 맞춘다.
- 모바일에서는 sticky를 적용하지 않는다 (공간 부족, 기존 반응형 원칙 유지).

### 5. 별자리 지도 — 선 그리기 애니메이션

- `constellation__lines`의 각 `<line>`에 `stroke-dasharray`/`stroke-dashoffset`을 이용한 CSS 애니메이션을 적용해, 섹션이 처음 뷰포트에 들어올 때 선이 순서대로 "그려지는" 효과를 준다. (구현 결정: 이 선들은 이미 `stroke-dasharray: 3 5`로 점선 질감을 내고 있고, `preserveAspectRatio="none"`으로 비율이 왜곡되는 SVG라 `stroke-dashoffset` 기반의 "그려지는" 효과를 적용하면 기존 점선 패턴이 깨진다. 대신 각 선에 인덱스 기반 `animation-delay`를 주는 순차 **페이드인**(opacity 0→1)으로 구현해 점선 질감을 그대로 유지했다.)
- IntersectionObserver로 섹션 진입을 감지해 1회만 트리거한다 (재트리거 없음, 성능 보호).
- `prefers-reduced-motion: reduce`에서는 애니메이션 없이 즉시 완성된 상태로 렌더링한다 (기존 미디어쿼리 규칙에 편입).
- 모바일에서는 어차피 선이 숨겨져 있으므로(`constellation__lines { display: none }`) 영향 없음.

### 6. 별자리 노드 마그네틱 호버

- 데스크톱에서 마우스가 노드 근처에 오면 노드가 커서 방향으로 아주 살짝(최대 3~4px) 끌리는 효과를 추가한다. `pointermove` 이벤트 기반, 순수 CSS transform.
- 키보드 포커스 시에는 마그네틱 효과 없이 기존 focus-visible 링만 사용한다 (접근성 우선).
- `prefers-reduced-motion: reduce`에서는 비활성화.

### 7. 섹션 스크롤 reveal

- `section` 단위로 IntersectionObserver를 사용해 처음 뷰포트에 들어올 때 `opacity`+`translateY(0.75rem→0)`로 부드럽게 나타나는 효과를 추가한다.
- 이미 렌더링된(뷰포트 진입 이전에 위치한) 섹션에는 애니메이션을 적용하지 않아 첫 화면 깜빡임을 막는다.
- `prefers-reduced-motion: reduce`에서는 즉시 최종 상태로 표시.
- 빌드 시 prerender된 정적 HTML에는 영향을 주지 않는다 (JS 하이드레이션 이후에만 관찰자가 동작하며, 초기 상태는 CSS 기본값으로 이미 보이는 상태를 유지해 SEO/무자바스크립트 대비를 해치지 않는다).

### 8. 카드 hover 디테일

- `.project-card:hover`의 `box-shadow`를 지금보다 더 부드럽고 넓게(낮은 opacity, 큰 blur) 조정해 "떠오르는" 느낌을 강화한다.
- accent 컬러를 카드 배경 전체가 아닌 상단 바/언더라인에만 계속 절제해 사용한다 (기존 원칙 유지).

## 접근성 / 성능 / 기존 원칙 준수

- 모든 새 모션은 `prefers-reduced-motion: reduce`에서 비활성화되거나 즉시 완료 상태로 표시된다.
- 키보드 포커스 스타일(`:focus-visible`)과 `aria-label`, `skip-link`, `aria-live` 검색 결과 등 기존 접근성 장치는 변경하지 않는다.
- 360px, 390px, 768px, 1024px, 1440px 반응형 기준을 그대로 검증한다.
- 새 npm 의존성을 추가하지 않는다.
- `forced-colors: active`, 다크/라이트 `color-scheme` 관련 기존 처리와 충돌하지 않는지 확인한다.

## 영향받는 파일 (예상)

- `src/styles.css` — 대부분의 변경
- `src/components/ConstellationMap.tsx` — 선 그리기, 마그네틱 호버 로직
- `src/components/FeaturedProjects.tsx` — bento 그리드 마크업 조정 (필요 시)
- `src/components/ProjectCard.tsx` — 인덱스 번호 마크업 추가
- `src/components/ProjectExplorer.tsx` — 필터 패널 sticky 마크업/클래스 조정 (필요 시)
- `src/App.tsx` 또는 신규 `src/lib/scroll-reveal.ts` 유틸 — 섹션 reveal 훅

## 테스트 계획

- `npm run lint`, `npm run typecheck`, `npm run test`, `npm run build`, `npm run check:build` 모두 통과.
- 로컬 `npm run dev`로 다음을 육안 확인:
  - 360px, 390px, 768px, 1024px, 1440px에서 가로 스크롤 없음
  - 별자리 선 그리기 애니메이션과 마그네틱 호버가 데스크톱에서 자연스럽게 동작
  - 모바일에서 별자리가 기존처럼 세로 목록으로 정상 표시
  - 키보드만으로 메뉴/지도/검색/필터/카드/링크 전부 조작 가능
  - `prefers-reduced-motion: reduce`로 전환 시 모든 새 모션이 즉시 멈추거나 생략됨
  - Console에 오류 없음
- 기존 Vitest 스위트가 카드/그리드 마크업 변경에 영향받지 않는지 확인하고, 필요한 경우 최소한으로 테스트를 갱신한다.

## 실행 주체

디자인 디테일 구현은 Opus 5 모델 기반 에이전트에게 위임한다. 이 스펙 파일과 구현 계획을 그대로 전달해 진행한다.
