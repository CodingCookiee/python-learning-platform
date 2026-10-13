import { describe, expect, it } from "vitest";
import { siteJsonLd } from "@/lib/landing/structured-data";

const data = siteJsonLd("https://pylearn.example", {
  python: { modules: ["Python for developers", "Collections and control flow"], hours: 140.4 },
  automation: { modules: ["Automation foundations"], hours: 60 },
});
const graph = data["@graph"] as Array<Record<string, unknown>>;
const byType = (type: string) => graph.filter((node) => node["@type"] === type);

describe("the landing page's structured data", () => {
  it("names the organization and the site, linked by id", () => {
    const [org] = byType("Organization");
    const [site] = byType("WebSite");
    expect(org).toMatchObject({ "@id": "https://pylearn.example/#organization", name: "pylearn" });
    expect(site).toMatchObject({ url: "https://pylearn.example/", publisher: { "@id": "https://pylearn.example/#organization" } });
  });

  it("describes both courses as free, online and from the published modules", () => {
    const courses = byType("Course");
    expect(courses.map((c) => c.name)).toEqual(["Python, white belt to black belt", "AI automation with Python"]);
    for (const c of courses) {
      expect(c).toMatchObject({ isAccessibleForFree: true, provider: { "@id": "https://pylearn.example/#organization" } });
      expect(c.offers).toEqual([{ "@type": "Offer", category: "Free", price: 0, priceCurrency: "USD" }]);
      expect(c.hasCourseInstance).toEqual([expect.objectContaining({ "@type": "CourseInstance", courseMode: "Online" })]);
    }
    expect(courses[0]!.hasCourseInstance).toEqual([expect.objectContaining({ courseWorkload: "PT140H" })]);
    expect(courses[0]!.syllabusSections).toEqual([
      { "@type": "Syllabus", name: "Python for developers" },
      { "@type": "Syllabus", name: "Collections and control flow" },
    ]);
    expect(String(courses[0]!.description)).toMatch(/^2 modules and about 140 hours of Python/);
  });
});
