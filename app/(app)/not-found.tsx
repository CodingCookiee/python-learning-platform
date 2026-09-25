import { StatusPage } from "@/components/brand/status-page";

export default function AppNotFound() {
  return (
    <StatusPage
      code="404"
      title="That page isn't on the syllabus."
      message="The lesson, module or project you were looking for doesn't exist, or its link has changed."
      actions={[
        { label: "Back to the dashboard", href: "/dashboard" },
        { label: "Open the syllabus", href: "/modules", variant: "outline" },
      ]}
    />
  );
}
