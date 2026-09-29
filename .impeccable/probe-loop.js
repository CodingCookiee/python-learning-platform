(async () => {
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const log = [];
  for (let i = 0; i < 60 && !window.monaco?.editor?.getModels?.()[0]; i++) await sleep(500);
  const model = window.monaco?.editor?.getModels?.()[0];
  if (!model) return "no editor";
  const live = () => [...document.querySelectorAll("[aria-live=polite]")].map((n) => n.innerText).join(" | ").replace(/\s+/g, " ").slice(0, 260);
  const button = (label) => [...document.querySelectorAll("button")].find((b) => b.textContent.trim() === label);
  for (let i = 0; i < 120 && /Loading Python/.test(document.body.innerText); i++) await sleep(500);

  model.setValue("orders = 0\nwhile True:\n    orders += 1\n");
  await sleep(200);
  const t0 = performance.now();
  button("Run")?.click();
  for (let i = 0; i < 60; i++) {
    await sleep(500);
    if (/Timed out/.test(live())) break;
  }
  log.push(`loop (${Math.round(performance.now() - t0)}ms): ${live()}`);

  model.setValue('print("still alive")\n');
  await sleep(200);
  const t1 = performance.now();
  button("Run")?.click();
  for (let i = 0; i < 80; i++) {
    await sleep(500);
    if (/still alive/.test(live())) break;
  }
  log.push(`recovered (${Math.round(performance.now() - t1)}ms): ${live()}`);

  model.setValue("def swap(a, b):\n    while True:\n        pass\n");
  await sleep(200);
  button("Run tests")?.click();
  for (let i = 0; i < 80; i++) {
    await sleep(500);
    if (/tests passed/.test(live())) break;
  }
  log.push(`per-test limit: ${live()}`);
  return log.join("\n");
})()
