const starterTemplateMap: Record<string, string> = {
  "CLI Calculator": "/templates/cli-calculator-starter.py",
  "Todo List Manager": "/templates/todo-list-manager-starter.py",
  "Text Processing CLI Tool": "/templates/text-processing-tool-starter.py",
  "Library Management System": "/templates/library-management-starter.py",
  "Data ETL Pipeline": "/templates/etl-pipeline-starter.py",
};

export function getProjectStarterTemplate(
  title: string,
  starterTemplate: string | null | undefined
): string | null {
  if (starterTemplate && (starterTemplate.startsWith("/") || starterTemplate.startsWith("http"))) {
    return starterTemplate;
  }

  return starterTemplateMap[title] ?? starterTemplate ?? null;
}
