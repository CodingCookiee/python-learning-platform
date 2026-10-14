/**
 * The landing page's structured data (schema.org JSON-LD), beside the FAQ's own: who runs pylearn,
 * the site, and the two courses it teaches, so search engines and AI answer engines can say what it
 * is ("a free online Python course from first syntax to the black belt") from facts, not guesses.
 * Every number comes from the published content.
 */

export interface CourseFacts {
  /** Module titles in order */
  modules: string[];
  /** Estimated hours across the track */
  hours: number;
}

/** pylearn's own profiles elsewhere (the organization's, never a person's), as `sameAs` */
export const ORGANIZATION_PROFILES = ["https://github.com/PL-PyLearn"];

export const SITE_DESCRIPTION =
  "A graded path from first Python syntax to advanced Python, then AI automation. Lessons, drills and gradings run in your browser. Free, no experience needed.";

export function siteJsonLd(origin: string, courses: { python: CourseFacts; automation: CourseFacts }) {
  const org = { "@id": `${origin}/#organization` };
  const course = (
    id: string,
    name: string,
    description: string,
    facts: CourseFacts,
    extra: Record<string, unknown>
  ) => ({
    "@type": "Course",
    "@id": `${origin}/#${id}`,
    name,
    description,
    url: `${origin}/#syllabus`,
    provider: org,
    inLanguage: "en",
    isAccessibleForFree: true,
    offers: [{ "@type": "Offer", category: "Free", price: 0, priceCurrency: "USD" }],
    hasCourseInstance: [
      {
        "@type": "CourseInstance",
        courseMode: "Online",
        // Self-paced: the whole track's estimated hours
        courseWorkload: `PT${Math.round(facts.hours)}H`,
      },
    ],
    syllabusSections: facts.modules.map((title) => ({ "@type": "Syllabus", name: title })),
    ...extra,
  });

  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        ...org,
        name: "pylearn",
        url: `${origin}/`,
        logo: `${origin}/brand/pylearn-logo.png`,
        sameAs: ORGANIZATION_PROFILES,
      },
      {
        "@type": "WebSite",
        "@id": `${origin}/#website`,
        name: "pylearn",
        url: `${origin}/`,
        description: SITE_DESCRIPTION,
        publisher: org,
        inLanguage: "en",
      },
      course(
        "python",
        "Python, white belt to black belt",
        `${facts(courses.python)} of Python, from first syntax to the data model, concurrency, FastAPI and databases. Each module ends in a graded test run in the browser; the black belt also needs three approved capstone projects.`,
        courses.python,
        {
          educationalLevel: "Beginner to advanced",
          teaches: ["Python", "pytest", "type hints and Pydantic", "asyncio", "FastAPI", "SQL databases"],
        }
      ),
      course(
        "automation",
        "AI automation with Python",
        `${facts(courses.automation)} of AI automation in Python: LLM APIs, structured output and tool calling, retrieval (RAG), agents, MCP servers and production systems.`,
        courses.automation,
        {
          educationalLevel: "Advanced",
          coursePrerequisites: "Python modules 1 to 14 of the pylearn syllabus, or the same skills",
          teaches: ["LLM APIs", "tool calling", "retrieval-augmented generation", "AI agents", "MCP servers"],
        }
      ),
    ],
  };
}

function facts(c: CourseFacts): string {
  return `${c.modules.length} modules and about ${Math.round(c.hours)} hours`;
}
