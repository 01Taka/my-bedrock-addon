import { world } from "@minecraft/server";
import {
  ORE_BLOCK_IDS,
  oreMassDestruction,
  treeMassDestruction,
} from "./mass-destruction";
import { handleTorchSwap } from "./offhand-touch";

// ==========================================
world.afterEvents.playerBreakBlock.subscribe((event) => {
  oreMassDestruction(event, ORE_BLOCK_IDS);
  treeMassDestruction(event);
});

world.beforeEvents.itemUse.subscribe((event) => {
  handleTorchSwap(event.source, () => {
    event.cancel = true;
  });
});
