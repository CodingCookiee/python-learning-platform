(async () => {
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const log = [];
  for (let i = 0; i < 60 && !window.monaco?.editor?.getModels?.()[0]; i++) await sleep(500);
  const models = () => window.monaco.editor.getModels().map((m) => JSON.stringify(m.getValue().slice(0, 50)));
  log.push("models at start: " + models().join(" ; "));
  log.push("saved: " + JSON.stringify(Object.entries(localStorage).filter(([k]) => k.startsWith("drill-")).map(([k, v]) => [k.slice(0, 14), v.slice(0, 40)])));
  const live = () => [...document.querySelectorAll("[aria-live=polite]")].map((n) => n.innerText).join(" | ").replace(/\s+/g, " ").slice(0, 200);
  const button = (label) => [...document.querySelectorAll("button")].find((b) => b.textContent.trim() === label);
  const idle = async () => {
    for (let i = 0; i < 120; i++) {
      await sleep(250);
      const run = [...document.querySelectorAll("button")].find((b) => /^(Run|Running|Checking|Loading)/.test(b.textContent.trim()) && b.getAttribute("aria-busy") === "true");
      if (!run) return;
    }
  };
  for (let i = 0; i < 120 && /Loading Python/.test(document.body.innerText); i++) await sleep(500);

  const model = window.monaco.editor.getModels()[0];
  model.setValue("orders = 0\nwhile True:\n    orders += 1\n");
  await sleep(300);
  log.push("models after set: " + models().join(" ; "));
  const t0 = performance.now();
  log.push("click Run: " + !!button("Run"));
  button("Run")?.click();
  await sleep(500);
  await idle();
  log.push(`loop (${Math.round(performance.now() - t0)}ms): ${live()}`);
  return log.join("\n");
})()
