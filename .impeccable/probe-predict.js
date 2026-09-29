(async () => {
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const log = [];
  const areas = [...document.querySelectorAll("textarea")].map((t) => t.getAttribute("placeholder") || t.className.slice(0, 30));
  log.push("textareas: " + JSON.stringify(areas));
  const box = document.querySelector('textarea[placeholder^="Type the output"]');
  if (!box) return log.concat("no answer box").join("\n");
  const setter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, "value").set;
  setter.call(box, "Total: 12\nA B C\ndone");
  box.dispatchEvent(new Event("input", { bubbles: true }));
  await sleep(300);
  const btn = [...document.querySelectorAll("button")].find((b) => /Check answer|Loading Python/.test(b.textContent));
  log.push("button: " + btn?.textContent.trim() + " aria-disabled=" + btn?.getAttribute("aria-disabled"));
  btn?.click();
  for (let i = 0; i < 80; i++) {
    await sleep(500);
    if (/Not quite|exactly what it prints/.test(document.body.innerText)) break;
  }
  log.push("after wrong: " + [...document.querySelectorAll("[aria-live=polite]")].map((n) => n.innerText).join(" | ").slice(0, 200));
  setter.call(box, "Total:12\nA > B > C!\ndone");
  box.dispatchEvent(new Event("input", { bubbles: true }));
  await sleep(300);
  [...document.querySelectorAll("button")].find((b) => /Check answer/.test(b.textContent))?.click();
  for (let i = 0; i < 40; i++) {
    await sleep(500);
    if (/exactly what it prints/.test(document.body.innerText)) break;
  }
  log.push("after right: " + [...document.querySelectorAll("[aria-live=polite]")].map((n) => n.innerText).join(" | ").slice(0, 200));
  log.push("passed banner: " + /Drill passed/.test(document.body.innerText));
  return log.join("\n");
})()
