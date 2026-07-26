import { StrictMode } from "react";
import { createRoot, hydrateRoot } from "react-dom/client";
import "pretendard/dist/web/variable/pretendardvariable-dynamic-subset.css";
import App from "./App";
import "./styles.css";

const rootElement = document.getElementById("root");

if (!rootElement) {
  throw new Error("앱을 시작할 #root 요소를 찾을 수 없습니다.");
}

const app = (
  <StrictMode>
    <App />
  </StrictMode>
);

// 배포본에는 빌드 시 만든 HTML이 들어 있으므로 기존 화면에 기능만 연결합니다.
// 개발 서버처럼 #root가 비어 있으면 평소처럼 React 화면을 새로 만듭니다.
if (rootElement.hasChildNodes()) {
  hydrateRoot(rootElement, app);
} else {
  createRoot(rootElement).render(app);
}
