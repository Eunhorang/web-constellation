# AGENTS.md

이 파일은 앞으로 이 저장소를 수정하는 Codex와 개발 도구가 지켜야 할 기준입니다.

## 프로젝트 목적

“은호랑의 웹 별자리”는 이정주가 공개한 웹사이트와 GitHub 프로젝트를 한곳에서 탐색하는 개인 웹 아카이브다. 공개 저장소 자동 수집, 수동 편집 정보, 검색·필터, SVG 기반 별자리 지도를 제공하며 GitHub Pages에 정적 배포한다.

## 기술 스택

- Vite
- React
- TypeScript strict mode
- Tailwind CSS 4와 프로젝트 CSS 토큰
- Vitest
- GitHub REST API
- GitHub Actions / GitHub Pages

Next.js, 서버 데이터베이스, 로그인형 관리자, Cloudflare Worker를 추가하지 않는다. 기능 요구가 생겨도 먼저 현재 정적 구조 안에서 해결한다.

## 주요 명령어

```bash
npm run sync
npm run dev
npm run lint
npm run typecheck
npm run test
npm run build
npm run check:build
```

변경 후에는 반드시 `lint`, `typecheck`, `test`, `build`, `check:build`를 모두 실행한다.

## 데이터 동기화 규칙

- 공개 사용자 API `/users/{username}/repos`만 사용한다.
- 100개 이상을 위한 페이지네이션을 유지한다.
- private repository는 절대 생성 JSON이나 클라이언트 번들에 넣지 않는다.
- fork와 archived는 기본 제외한다.
- GitHub API 또는 Pages API 실패는 전체 빌드 실패로 만들지 않는다.
- 마지막 정상 `src/data/projects.generated.json`을 캐시로 유지한다.
- Pages 주소 우선순위는 override `liveUrl` → homepage → Pages API → 기본 Pages 주소다.
- API 응답 전체를 저장하지 않고 필요한 공개 필드만 명시적으로 복사한다.

## project-overrides.json 관리 규칙

- `src/data/project-overrides.json`이 사람이 편집하는 프로젝트 관리의 단일 원본이다.
- `src/data/projects.generated.json`은 직접 편집하지 않는다.
- 수동 설정이 자동값보다 우선한다.
- `hidden: true`는 모든 화면과 구조화 데이터에서 제외한다.
- `featured: true`는 `order` 오름차순으로 최대 3개만 대표 영역에 표시한다.
- `liveUrl: ""`는 실제 사이트 링크를 의도적으로 숨기는 값으로 유지한다.
- 알 수 없는 프로젝트를 실제 프로젝트처럼 만드는 placeholder를 추가하지 않는다.

## 비밀 정보와 개인정보

- GitHub 토큰, API 키, 비밀번호를 코드·JSON·README에 작성하지 않는다.
- 비밀 값에는 `VITE_` 접두사를 붙이지 않는다.
- `.env.local`은 커밋하지 않고 `.env.example`에는 가짜 예시만 둔다.
- 학생 실명, 연락처, 상담·생활기록 자료 등 개인정보를 예시 데이터에 넣지 않는다.
- `dangerouslySetInnerHTML`을 사용하지 않는다.
- 사용자 입력이나 외부 API 문자열을 HTML로 직접 삽입하지 않는다.

## 디자인 시스템

- 배경 `#F4F2EC`, 표면 `#FAF9F5`, 글자 `#202522`, 포인트 `#66766A` 중심의 밝고 차분한 종이 기반 디자인을 유지한다.
- `Pretendard Variable`의 dynamic subset을 실제 로드하며 제목·본문·UI를 동일한 현대적 산세리프 체계로 유지한다. 별도 요청 없이 운영체제 의존 명조체로 되돌리지 않는다.
- 본문 최소 크기는 16px, 카드 반경은 12~18px를 유지한다.
- 무거운 그라데이션, 네온, 과도한 glassmorphism, 전체 화면 입자 애니메이션을 금지한다.
- 새로운 색은 카드 전체가 아니라 작은 노드·선·표식에 절제해 사용한다.
- ianlab.app에서는 개인 스튜디오의 정보 구조만 참고한다. 문구, 브랜드, 색, 폰트, 카드 배치, 애니메이션, 그래픽, 푸터와 화면 전환을 복제하지 않는다.

## 접근성 기준

- 의미 있는 `header`, `nav`, `main`, `section`, `article`, `footer` 구조를 유지한다.
- h1은 한 개만 사용하고 제목 레벨 순서를 지킨다.
- 모든 기능을 키보드로 사용할 수 있어야 한다.
- `focus-visible` 표시를 제거하지 않는다.
- Skip to content, `aria-live` 검색 결과, 아이콘 버튼의 `aria-label`을 유지한다.
- 상태는 색만으로 구분하지 않고 한글 상태명과 표식을 함께 보여준다.
- `prefers-reduced-motion`을 존중한다.

## 반응형 기준

- 360px, 390px, 768px, 1024px, 1440px에서 점검한다.
- 가로 스크롤을 CSS로 숨겨 문제를 덮지 말고 원인 요소의 너비를 고친다.
- 모든 grid 자식은 긴 저장소명과 태그를 견딜 수 있어야 한다.
- 모바일에서는 SVG 선을 숨기고 동일한 시맨틱 프로젝트 목록을 세로 지도로 사용한다.
- 버튼과 링크의 터치 영역은 최소 44px을 유지한다.

## 의존성과 외부 링크

- 기존 CSS와 작은 직접 제작 SVG로 해결할 수 있으면 UI·애니메이션 라이브러리를 추가하지 않는다.
- 새 의존성은 기능에 꼭 필요한 경우만 추가하고 이유를 기록한다.
- 모든 웹 외부 링크는 `target="_blank"`와 `rel="noopener noreferrer"`를 사용한다.
- 실제 사이트 주소가 없으면 방문 버튼을 렌더링하지 않는다.
