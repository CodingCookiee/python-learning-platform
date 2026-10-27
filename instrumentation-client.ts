import { initBotId } from "botid/client/core";
import { BOT_CHECKED } from "@/lib/bot-routes";

// Vercel BotID signs these requests so the server can tell a person from a script (lib/bot-check.ts)
initBotId({ protect: BOT_CHECKED });
