import { initBotId } from "botid/client/core";
import { BOT_CHECKED, canRunBotCheck } from "@/lib/bot-routes";

// Vercel BotID signs these requests so the server can tell a person from a script (lib/bot-check.ts).
// Not where its challenge can't run (plain HTTP on a network address, e.g. a phone on the Wi-Fi), or
// sign-in would wait for ever. The live site is always HTTPS, so it's always signed there.
if (canRunBotCheck(window)) initBotId({ protect: BOT_CHECKED });
