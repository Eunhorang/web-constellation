# 정주의 웹 별자리

> 내가 만든 웹들이 서로의 좌표가 되는 곳.

이정주가 GitHub에 공개한 웹사이트와 웹 프로젝트를 한곳에서 검색하고 둘러볼 수 있는 개인 웹 아카이브입니다. 공개 저장소 정보는 GitHub REST API에서 자동으로 가져오고, 제목·설명·상태·대표 여부 같은 편집 정보는 한 개의 JSON 파일에서 관리합니다.

## 1. 무엇을 만들었나요?

- GitHub 공개 저장소와 배포 사이트 자동 수집
- 고정 좌표를 사용하는 접근 가능한 웹 별자리 지도
- 프로젝트명·설명 검색
- 상태·분류·태그 필터와 세 가지 정렬 방식
- 검색/필터 상태가 포함된 공유 가능한 주소
- 대표 프로젝트와 제작 중인 프로젝트 영역
- 모바일 우선 반응형 화면
- GitHub Pages 자동 배포와 매일 한 번 자동 동기화
- 검색 엔진 및 공유용 메타 정보, 구조화 데이터, 1200×630 공유 이미지
- GitHub API 실패 시 마지막 정상 캐시로 계속 빌드하는 안전장치

현재 설정된 GitHub 사용자는 `Eunhorang`이며, 사이트 주소는 `https://eunhorang.github.io/web-constellation/`을 기준으로 구성되어 있습니다.

## 2. 프로젝트 파일 구조

```text
web-constellation/
├─ .github/workflows/
│  └─ deploy-pages.yml          # GitHub Pages 자동 검사·배포
├─ public/
│  ├─ favicon.svg               # 브라우저 탭 아이콘
│  ├─ og-image.png              # 1200×630 공유 이미지
│  ├─ robots.txt                # 검색 로봇 안내(빌드 시 갱신)
│  └─ sitemap.xml               # 사이트맵(빌드 시 갱신)
├─ scripts/
│  ├─ github-sync-core.mjs      # GitHub 수집·검증 핵심 기능
│  ├─ sync-github.mjs           # 공개 저장소 동기화 실행 파일
│  ├─ generate-seo.mjs          # robots.txt와 sitemap.xml 생성
│  ├─ prepare-build.mjs         # 빌드 전 동기화와 SEO 준비
│  └─ check-build-security.mjs  # 비공개 정보·토큰 노출 검사
├─ src/
│  ├─ components/               # 화면의 각 영역
│  ├─ data/
│  │  ├─ project-overrides.json # 프로젝트 관리의 단일 원본
│  │  ├─ projects.generated.json# GitHub에서 만든 마지막 정상 캐시
│  │  └─ site-config.json       # 이름·소개·연락처 설정
│  ├─ lib/                      # 병합·검색·정렬·좌표 계산
│  ├─ types/                    # 데이터 형식 설명
│  ├─ App.tsx                   # 한 페이지 전체 구성
│  ├─ main.tsx                  # React 시작 파일
│  └─ styles.css                # 디자인·반응형·접근성 스타일
├─ tests/                       # Vitest 자동 테스트
├─ .env.example                # 비밀 값 없는 환경 설정 예시
├─ AGENTS.md                    # 다음 Codex 작업이 지킬 기준
├─ index.html                   # SEO와 앱 시작 HTML
├─ package.json                # 실행 명령과 패키지 목록
├─ tsconfig.json               # TypeScript 검사 설정
└─ vite.config.ts              # Vite와 GitHub Pages 경로 설정
```

`src/data/projects.generated.json`은 자동 생성 파일입니다. 직접 고치지 말고 `src/data/project-overrides.json`을 수정하세요.

## 3. Mac에서 처음 실행하기

### 준비물

- Node.js 20.19 이상(권장: Node.js 22)
- npm
- 선택 사항: GitHub CLI `gh`

터미널에서 이 프로젝트 폴더로 이동한 뒤 아래 명령을 한 줄씩 실행합니다.

```bash
npm install
```

이 명령은 사이트 실행에 필요한 외부 도구를 설치합니다.

```bash
npm run sync
```

이 명령은 GitHub의 공개 저장소만 읽어 `projects.generated.json`을 갱신합니다.

```bash
npm run dev
```

이 명령은 내 Mac에서 확인용 사이트를 실행합니다. 브라우저에서 `http://localhost:5173`으로 접속하세요.

서버를 멈추려면 터미널에서 `Control + C`를 누릅니다.

> Windows에서도 명령은 같습니다. 폴더 이동 경로 표기만 `C:\...` 형태로 다를 수 있습니다.

## 4. 사이트 기본 정보 바꾸기

다음 파일을 엽니다.

```text
src/data/site-config.json
```

주요 항목은 다음과 같습니다.

| 항목 | 의미 |
|---|---|
| `owner` | 제작자 이름 |
| `githubUsername` | 공개 저장소를 가져올 GitHub 사용자명 |
| `repository` | 이 사이트를 배포할 저장소 이름 |
| `email` | 화면에 표시할 연락 이메일 |
| `canonicalUrl` | 검색 엔진에 알려줄 최종 사이트 주소 |
| `tagline` | 히어로의 핵심 문구 |
| `aboutText` | “만든 사람” 소개 문구 |
| `blogUrl` | 비워 두면 블로그 링크가 숨겨짐 |
| `channelUrl` | 비워 두면 다른 채널 링크가 숨겨짐 |

## 5. 프로젝트 추가·수정·숨기기

관리 파일은 다음 하나입니다.

```text
src/data/project-overrides.json
```

### 새 공개 프로젝트 추가하기

1. `Eunhorang` 계정에 새 공개 저장소를 만듭니다.
2. 저장소에 코드를 올립니다.
3. GitHub Pages 또는 다른 공개 사이트를 연결합니다.
4. 아래 명령을 실행합니다.

```bash
npm run sync
```

수동 설정이 없어도 새 공개 저장소는 전체 프로젝트 목록에 자동으로 나타납니다.

제목이나 분류를 꾸미고 싶으면 배열 안에 다음 객체를 추가합니다. 앞 객체 뒤에는 쉼표 `,`가 필요합니다.

```json
{
  "repo": "실제-저장소-이름",
  "title": "화면에 표시할 제목",
  "description": "한 줄로 이해할 수 있는 설명",
  "liveUrl": "https://example.com/",
  "category": "교육",
  "status": "live",
  "tags": ["React", "학습지"],
  "featured": false,
  "hidden": false,
  "order": 10,
  "accent": "#66766a",
  "launchedAt": "2026-07-12",
  "note": "공개 저장소에 함께 올라가는 관리 메모(민감정보 금지)"
}
```

`repo`에는 GitHub 주소의 마지막 저장소 이름을 정확히 입력해야 합니다.

### 프로젝트 숨기기

```json
{
  "repo": "숨길-저장소-이름",
  "hidden": true
}
```

### 제목과 설명 바꾸기

```json
{
  "repo": "저장소-이름",
  "title": "새 제목",
  "description": "새 설명"
}
```

수동 값이 GitHub의 자동 값보다 우선합니다.

### 커스텀 도메인 지정하기

```json
{
  "repo": "저장소-이름",
  "liveUrl": "https://my-project.example.com/"
}
```

`liveUrl` 우선순위는 수동 주소 → GitHub 저장소의 homepage → Pages API 주소 → 기본 Pages 주소입니다. 사이트 방문 버튼을 일부러 숨기려면 `"liveUrl": ""`로 설정합니다.

### 프로젝트 상태 바꾸기

| 값 | 화면 표시 | 사용 예 |
|---|---|---|
| `live` | 운영 중 | 실제로 사용할 수 있는 서비스 |
| `experiment` | 실험 중 | 아이디어를 시험하는 프로젝트 |
| `building` | 준비 중 | 현재 제작 중인 프로젝트 |
| `archived` | 보관됨 | 더 이상 운영하지 않는 기록 |

GitHub에서 archived 처리한 저장소는 기본적으로 제외됩니다. 꼭 보여주고 싶으면 해당 저장소의 override에 `"status": "archived"`를 넣으세요.

### 대표 프로젝트 지정하기

```json
{
  "repo": "저장소-이름",
  "featured": true,
  "order": 1
}
```

대표 영역에는 `featured: true`인 프로젝트 중 `order` 숫자가 작은 순서로 최대 3개가 표시됩니다.

## 6. GitHub 사용자명 확인 순서

동기화 스크립트는 사용자명을 다음 순서로 찾습니다.

1. `GITHUB_USERNAME` 환경 설정
2. `gh api user --jq .login`으로 확인한 GitHub CLI 로그인 사용자
3. `git remote origin` 주소의 소유자
4. `src/data/site-config.json`의 `githubUsername`

GitHub CLI가 로그인되어 있으면 동기화 스크립트는 CLI에 안전하게 저장된 인증을 사용해 Pages의 정확한 공개 주소도 확인합니다. 토큰 값은 JSON이나 브라우저 코드에 저장하지 않습니다.

GitHub 요청 한도를 늘리고 싶을 때만 `.env.local`을 만들 수 있습니다.

```bash
cp .env.example .env.local
```

`.env.local`의 placeholder를 실제 값으로 바꾸되, GitHub 토큰은 반드시 `GITHUB_TOKEN`에만 넣습니다. `VITE_GITHUB_TOKEN`처럼 `VITE_`가 붙은 이름은 브라우저에 노출될 수 있으므로 사용하지 마세요.

학교나 학생 관련 프로젝트를 공개할 때는 학생 실명, 연락처, 상담 기록 등 개인정보가 저장소와 생성 JSON에 들어가지 않았는지 반드시 확인하세요.

## 7. 자동 동기화와 캐시

```bash
npm run sync
```

- `/users/{username}/repos` 공개 API만 사용합니다.
- 100개가 넘는 저장소도 다음 페이지를 계속 읽습니다.
- 비공개 저장소는 이중 조건으로 제외합니다.
- fork와 archived 저장소는 기본적으로 제외합니다.
- Pages 상세 API가 404여도 `has_pages` 기본 주소를 사용합니다.
- API 장애나 요청 한도 초과가 발생하면 마지막 정상 `projects.generated.json`을 유지하고 빌드를 계속합니다.

## 8. 품질 검사와 프로덕션 빌드

아래 명령을 한 줄씩 실행합니다.

```bash
npm run lint
```

코드 문법과 실수 가능성을 검사합니다.

```bash
npm run typecheck
```

데이터 형식과 TypeScript 오류를 검사합니다.

```bash
npm run test
```

병합, 숨김, 주소 우선순위, 검색, 필터, 캐시 fallback, 비공개 저장소 제외를 자동 테스트합니다.

```bash
npm run build
```

GitHub 동기화와 SEO 파일 생성을 실행한 뒤 `dist/` 폴더에 배포용 사이트를 만듭니다.

```bash
npm run check:build
```

생성 데이터에 비공개 저장소가 없는지, 배포 파일에 GitHub 토큰이 들어가지 않았는지 검사합니다.

```bash
npm run preview
```

완성된 `dist/` 결과를 로컬에서 미리 봅니다. 터미널에 표시된 주소로 접속하세요.

## 9. 눈으로 확인하는 테스트

1. 브라우저에서 `http://localhost:5173`에 접속합니다.
2. 화면 폭을 360px, 390px, 768px, 1024px, 1440px로 바꿔 가로 스크롤이 없는지 봅니다.
3. 모바일에서 메뉴 버튼과 필터가 겹치지 않는지 확인합니다.
4. `/` 키를 눌렀을 때 검색창으로 이동하는지 확인합니다.
5. 검색창에 `AI`를 입력해 결과 수와 주소의 `?q=AI`가 함께 바뀌는지 확인합니다.
6. `Esc` 키를 눌러 검색어가 지워지는지 확인합니다.
7. 상태·분류·태그 필터와 정렬을 하나씩 바꿉니다.
8. 별자리 노드를 Tab 키로 선택하고 Enter 키로 프로젝트 카드에 이동합니다.
9. 사이트 방문과 GitHub 링크가 새 탭에서 열리는지 확인합니다.
10. 실제 사이트 주소가 없는 테스트 데이터에서는 방문 버튼이 나타나지 않는지 확인합니다.
11. 개발자 도구 Console에 빨간 오류가 없는지 확인합니다.

## 10. GitHub Pages 배포

`.github/workflows/deploy-pages.yml`은 다음 때 자동으로 실행됩니다.

- `main` 브랜치에 push할 때
- GitHub Actions에서 수동 실행할 때
- 매일 한국 시간 오전 8시 17분경

### 저장소가 아직 없을 때

GitHub CLI 로그인 상태를 확인합니다.

```bash
gh auth status
```

새 공개 저장소를 만들고 현재 폴더를 연결합니다.

```bash
gh repo create web-constellation --public --source=. --remote=origin
```

파일을 커밋하고 올립니다.

```bash
git add .
```

```bash
git commit -m "feat: launch web constellation"
```

```bash
git push -u origin main
```

저장소가 이미 있으면 `gh repo create`는 다시 실행하지 마세요.

첫 push 뒤 GitHub Pages를 Actions 방식으로 활성화합니다.

```bash
gh api --method POST repos/Eunhorang/web-constellation/pages -f build_type=workflow
```

`HTTP 409` 또는 “already exists”가 나오면 이미 Pages가 있으므로 다음 명령으로 설정만 확인합니다.

```bash
gh api --method PUT repos/Eunhorang/web-constellation/pages -f build_type=workflow
```

첫 push와 Pages 활성화 시점이 겹쳐 첫 자동 실행이 실패했다면 아래 수동 실행 명령으로 한 번 더 배포합니다.

### 배포가 자동으로 시작되지 않을 때

1. GitHub 저장소 페이지에서 **Settings**를 엽니다.
2. 왼쪽 메뉴의 **Pages**를 엽니다.
3. **Build and deployment → Source**를 **GitHub Actions**로 선택합니다.
4. **Actions** 탭에서 **Deploy to GitHub Pages**를 엽니다.
5. **Run workflow** 버튼으로 다시 실행합니다.

터미널에서도 수동 실행할 수 있습니다.

```bash
gh workflow run deploy-pages.yml
```

실행 상태를 확인합니다.

```bash
gh run watch
```

일반 저장소의 예상 주소는 `https://eunhorang.github.io/web-constellation/`입니다.

## 11. 자주 생기는 오류

```text
오류 메시지:
Unexpected token 또는 JSON parse 오류

발생 원인:
project-overrides.json에서 쉼표, 큰따옴표, 대괄호가 빠졌습니다.

해결 방법:
마지막 객체를 제외한 각 객체 뒤에 쉼표가 있는지 확인하고 npm run typecheck를 실행합니다.

확인할 파일:
src/data/project-overrides.json
```

```text
오류 메시지:
GitHub API 요청 실패: HTTP 403 또는 요청 한도 소진

발생 원인:
짧은 시간에 인증 없는 GitHub API 요청을 많이 보냈습니다.

해결 방법:
마지막 정상 캐시가 자동으로 사용되므로 빌드는 계속할 수 있습니다. 필요하면 .env.local의 GITHUB_TOKEN을 설정하고 다시 npm run sync를 실행합니다.

확인할 파일:
.env.local, src/data/projects.generated.json
```

```text
오류 메시지:
배포 사이트에서 JS/CSS 404 또는 빈 화면

발생 원인:
GitHub Pages의 저장소 하위 경로와 Vite base 경로가 다릅니다.

해결 방법:
SITE_REPOSITORY가 실제 저장소 이름인지 확인하고 GitHub Actions를 다시 실행합니다.

확인할 파일:
vite.config.ts, .github/workflows/deploy-pages.yml
```

```text
오류 메시지:
npm ci can only install packages when package-lock.json is in sync

발생 원인:
package.json을 바꾼 뒤 package-lock.json을 갱신하지 않았습니다.

해결 방법:
로컬에서 npm install을 한 번 실행하고 두 파일을 함께 커밋합니다.

확인할 파일:
package.json, package-lock.json
```

## 12. 완료 후 점검 체크리스트

- [ ] `npm install` 또는 `npm ci` 성공
- [ ] `npm run sync` 성공 또는 캐시 fallback 경고만 표시
- [ ] `npm run lint` 성공
- [ ] `npm run typecheck` 성공
- [ ] `npm run test` 성공
- [ ] `npm run build` 성공
- [ ] `npm run check:build` 성공
- [ ] 모바일 360px과 390px에서 가로 스크롤 없음
- [ ] 키보드만으로 메뉴·지도·검색·필터·링크 사용 가능
- [ ] 외부 링크가 새 탭에서 안전하게 열림
- [ ] 학생 개인정보와 GitHub 토큰이 공개 파일에 없음
- [ ] GitHub Actions 배포 성공 후 실제 주소 접속 확인

## 13. 다음에 확장하기 좋은 기능

1. GitHub topics를 더 세밀한 카테고리로 자동 변환
2. 프로젝트별 미리보기 이미지 선택 지원
3. 연도별 프로젝트 타임라인 보기

처음에는 현재 구조처럼 “공개 저장소 자동 수집 + JSON 한 파일 수동 관리”를 유지하는 것이 가장 안전하고 관리하기 쉽습니다.
