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
      await db.query(`update streaks set "currentStreak"=4,"longestStreak"=9 where "userId"=$1`, [uid]);
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
  } else if (mode === "remove") {
    const r = await db.query(`delete from users where email=$1`, [EMAIL]);
    console.log("removed", r.rowCount);
  }
  await db.end();
})().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
