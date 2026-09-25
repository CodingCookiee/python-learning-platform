// Dev-only: create or remove a throwaway admin account for signed-in screenshots.
require("dotenv").config({ path: __dirname + "/../.env", quiet: true });
const { Client } = require("pg");
const EMAIL = "design-review@pylearn.local";

(async () => {
  const mode = process.argv[2];
  const db = new Client({ connectionString: process.env.DATABASE_URL });
  await db.connect();
  if (mode === "promote") {
    const r = await db.query(`update users set role='ADMIN', xp=240 where email=$1 returning id`, [EMAIL]);
    // Mark the first module's lessons complete so rank, stripes and history render with data
    if (r.rows[0]) {
      const uid = r.rows[0].id;
      const lessons = await db.query(
        `select l.id from lessons l join modules m on m.id=l."moduleId" where m."order"=1`
      );
      for (const l of lessons.rows) {
        await db.query(
          `insert into progress (id,"userId","lessonId",completed,"completedAt","createdAt","updatedAt")
           values (gen_random_uuid()::text,$1,$2,true,now(),now(),now()) on conflict do nothing`,
          [uid, l.id]
        );
      }
      await db.query(`update streaks set "currentStreak"=1,"longestStreak"=9,"lastActivityDate"=now() where "userId"=$1`, [uid]);
      const ach = await db.query(`select id from achievements order by "xpReward" asc limit 3`);
      for (const a of ach.rows) {
        await db.query(
          `insert into user_achievements (id,"userId","achievementId","unlockedAt")
           values (gen_random_uuid()::text,$1,$2,now()) on conflict do nothing`,
          [uid, a.id]
        );
      }
    }
    console.log("promoted", r.rowCount);
  } else if (mode === "fixtures") {
    // A sample drill on module 2's first lesson, and a pending capstone submission
    const u = await db.query(`select id from users where email=$1`, [EMAIL]);
    const lesson = await db.query(
      `select l.id from lessons l join modules m on m.id=l."moduleId" where m."order"=2 order by l."order" limit 1`
    );
    const project = await db.query(
      `select p.id from projects p join modules m on m.id=p."moduleId" where m."order"=1 limit 1`
    );
    const ex = await db.query(
      `insert into exercises (id,"lessonId",title,description,instructions,"starterCode",solution,"testCases",hints,difficulty,"order","xpReward","createdAt","updatedAt")
       values (gen_random_uuid()::text,$1,'[review] Swap the first and last',
       'Swap the first and last items of a list.',
       $2,$3,$4,$5,$6,'medium',99,25,now(),now()) returning id`,
      [
        lesson.rows[0].id,
        "Write `swap_ends(items)` that returns a **new** list with the first and last items swapped.\n\n```python\nswap_ends([1, 2, 3])\n```\n\nShould give `[3, 2, 1]`. Leave the original list unchanged.",
        "def swap_ends(items):\n    # Return a new list with the first and last items swapped\n    pass\n\nprint(swap_ends([1, 2, 3]))\n",
        "def swap_ends(items):\n    if len(items) < 2:\n        return list(items)\n    return [items[-1], *items[1:-1], items[0]]\n\nprint(swap_ends([1, 2, 3]))\n",
        JSON.stringify([{ description: "Swaps a three-item list", expected: "[3, 2, 1]" }]),
        JSON.stringify(["Slicing with items[1:-1] gives you the middle.", "Build a new list instead of changing the original."]),
      ]
    );
    await db.query(
      `insert into project_submissions (id,"userId","projectId",files,status,"submittedAt")
       values (gen_random_uuid()::text,$1,$2,$3,'pending',now())`,
      [
        u.rows[0].id,
        project.rows[0].id,
        JSON.stringify({ type: "github", url: "https://github.com/example/cli-calculator", notes: "Review fixture" }),
      ]
    );
    console.log("fixtures", JSON.stringify({ exercise: ex.rows[0].id }));
  } else if (mode === "remove") {
    await db.query(`delete from exercises where title like '[review]%'`);
    const r = await db.query(`delete from users where email=$1`, [EMAIL]);
    console.log("removed", r.rowCount);
  }
  await db.end();
})().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
