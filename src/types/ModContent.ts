import type { ModUpgraded } from "isaacscript-common";

export abstract class ModContent {
  protected mod: ModUpgraded;

  protected constructor(mod: ModUpgraded) {
    this.mod = mod;
    this.AddCallbacks(mod);
  }

  AddCallbacks(mod: ModUpgraded): void {}
}
