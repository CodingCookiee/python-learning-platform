// Register the throwaway review account and record the ids of pages to capture
require("dotenv").config({ path: process.cwd() + "/.env", quiet: true });
const { Client } = require("pg");
const fs = require("fs");

(async () => {
  const res = await fetch("http://localhost:3000/api/auth/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name: "Design Review",
      email: "design-review@pylearn.local",
      password: "ReviewPass!2026",
      confirmPassword: "ReviewPass!2026",
    }),
  });
  console.log("register", res.status);

  const db = new Client({ connectionString: process.env.DATABASE_URL });
  await db.connect();
  const q = async (sql, args = []) => (await db.query(sql, args)).rows;
  const [mod] = await q(`select id from modules where slug = 'python-basics'`);
  const lessons = await q(`select id, slug from lessons where "moduleId" = $1 and "archivedAt" is null order by "order"`, [mod.id]);
  const drills = await q(
    `select e.id, e.slug, e.type from exercises e join lessons l on l.id = e."lessonId"
     where l."moduleId" = $1 and e."archivedAt" is null order by l."order", e."order"`,
    [mod.id]
  );
  const [project] = await q(`select id from projects where "moduleId" = $1 and "archivedAt" is null`, [mod.id]);
  const [oop] = await q(`select id from modules where slug = 'oop'`);
  const ids = {
    module: mod.id,
    lesson: lessons[0].id,
    lesson2: lessons[1].id,
    project: project?.id,
    oopModule: oop?.id,
    drills: Object.fromEntries(drills.map((d) => [d.slug, d.id])),
  };
  fs.writeFileSync(process.env.TEMP + "/review-ids.json", JSON.stringify(ids, null, 2));
  console.log(JSON.stringify({ ...ids, drills: Object.keys(ids.drills).length }));
  await db.end();
})();
