(async () => {
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const log = [];
  for (let i = 0; i < 60 && !window.monaco?.editor?.getModels?.()[0]; i++) await sleep(500);
  const model = window.monaco.editor.getModels()[0];
  const live = () => [...document.querySelectorAll("[aria-live=polite]")].map((n) => n.innerText).join(" | ").replace(/\s+/g, " ").slice(0, 220);
  const runButtons = () => [...document.querySelectorAll("button")].filter((b) => b.textContent.trim() === "Run");
  const button = (label) => [...document.querySelectorAll("button")].find((b) => b.textContent.trim() === label);
  const waitIdle = async () => {
    await sleep(400);
    for (let i = 0; i < 160; i++) {
      if (![...document.querySelectorAll("button[aria-busy=true]")].length) return;
      await sleep(250);
    }
  };
  for (let i = 0; i < 120 && /Loading Python/.test(document.body.innerText); i++) await sleep(500);
  log.push("Run buttons on the page: " + runButtons().length);

  model.setValue("orders = 0\nwhile True:\n    orders += 1\n");
  await sleep(300);
  let t = performance.now();
  button("Run")?.click();
  await waitIdle();
  log.push(`loop in Run (${Math.round(performance.now() - t)}ms): ${live()}`);

  model.setValue('print("still alive")\n');
  await sleep(300);
  t = performance.now();
  button("Run")?.click();
  await waitIdle();
  log.push(`next run (${Math.round(performance.now() - t)}ms): ${live()}`);

  model.setValue("def swap(a, b):\n    while True:\n        pass\n");
  await sleep(300);
  t = performance.now();
  button("Run tests")?.click();
  await waitIdle();
  log.push(`loop in tests (${Math.round(performance.now() - t)}ms): ${live()}`);
  return log.join("\n");
})()
