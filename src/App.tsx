import { About } from "./components/About";
import { ConstellationMap } from "./components/ConstellationMap";
import { CurrentWork } from "./components/CurrentWork";
import { FeaturedProjects } from "./components/FeaturedProjects";
import { Hero } from "./components/Hero";
import { ProjectExplorer } from "./components/ProjectExplorer";
import { SiteFooter } from "./components/SiteFooter";
import { SiteHeader } from "./components/SiteHeader";
import generatedJson from "./data/projects.generated.json";
import overridesJson from "./data/project-overrides.json";
import siteConfigJson from "./data/site-config.json";
import { getFeaturedProjects, mergeProjects } from "./lib/projects";
import type {
  GeneratedProjects,
  ProjectOverride,
  SiteConfig,
} from "./types/project";

const generated = generatedJson as GeneratedProjects;
const overrides = overridesJson as ProjectOverride[];
const siteConfig = siteConfigJson as SiteConfig;

export default function App() {
  const projects = mergeProjects(generated.projects, overrides);
  const featured = getFeaturedProjects(projects);
  const liveCount = projects.filter((project) => project.status === "live").length;
  const githubUrl = `https://github.com/${siteConfig.githubUsername}`;

  return (
    <div id="top" className="site-shell">
      <a className="skip-link" href="#main-content">본문으로 건너뛰기</a>
      <SiteHeader siteName={siteConfig.siteName} githubUrl={githubUrl} />
      <main id="main-content" tabIndex={-1}>
        <Hero
          englishLabel={siteConfig.englishLabel}
          siteName={siteConfig.siteName}
          tagline={siteConfig.tagline}
          description={siteConfig.heroDescription}
          totalCount={projects.length}
          liveCount={liveCount}
          generatedAt={generated.generatedAt}
          githubUrl={githubUrl}
        />
        <ConstellationMap projects={projects} />
        <FeaturedProjects projects={featured} />
        <ProjectExplorer projects={projects} />
        <CurrentWork projects={projects} />
        <About config={siteConfig} />
      </main>
      <SiteFooter
        siteName={siteConfig.siteName}
        owner={siteConfig.owner}
        generatedAt={generated.generatedAt}
        githubUrl={githubUrl}
      />
    </div>
  );
}
