import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { StrictMode, createElement } from "react";
import { renderToString } from "react-dom/server";
import { createServer } from "vite";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const indexPath = path.join(root, "dist", "index.html");
const rootMarker = '<div id="root"></div>';

// Vite가 TypeScript, 경로 별칭, JSON import를 개발 화면과 똑같이 해석하게 합니다.
const vite = await createServer({
  root,
  appType: "custom",
  logLevel: "error",
  mode: "production",
  // 정적 HTML 생성에는 브라우저 자동 새로고침용 WebSocket이 필요하지 않습니다.
  server: { middlewareMode: true, hmr: false, ws: false },
});

try {
  const { default: App } = await vite.ssrLoadModule("/src/App.tsx");
  const appHtml = renderToString(
    createElement(StrictMode, null, createElement(App)),
  );
  const indexHtml = await fs.readFile(indexPath, "utf8");

  if (!indexHtml.includes(rootMarker)) {
    throw new Error(
      "[프리렌더 오류] dist/index.html에서 비어 있는 #root 요소를 찾지 못했습니다.",
    );
  }
  if (!appHtml.includes("<h1")) {
    throw new Error("[프리렌더 오류] 생성된 본문에서 h1 제목을 찾지 못했습니다.");
  }

  const prerenderedHtml = indexHtml.replace(
    rootMarker,
    `<div id="root">${appHtml}</div>`,
  );
  await fs.writeFile(indexPath, prerenderedHtml);
  console.log(`[prerender] 실제 본문 HTML 생성 완료: ${appHtml.length}자`);
} finally {
  await vite.close();
}
