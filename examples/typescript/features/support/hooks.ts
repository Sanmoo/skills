import { AfterAll, BeforeAll } from "@cucumber/cucumber";
import { startService, type RunningService } from "./service.js";
import { LibraryWorld } from "./world.js";

let service: RunningService | undefined;

BeforeAll({ timeout: 180_000 }, async () => {
  service = await startService();
  LibraryWorld.baseUrl = service.baseUrl;
});

AfterAll({ timeout: 60_000 }, async () => {
  await service?.stop();
});
