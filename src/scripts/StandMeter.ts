import type { ModUpgraded } from "isaacscript-common";
import { ModContent } from "../types/ModContent";

export class StandMeter extends ModContent {
  sprite: Sprite;
  charged: string;
  uncharging: string;
  XOffset: number;
  YOffset: number;

  constructor(mod: ModUpgraded) {
    super(mod);
    this.sprite = Sprite();
    this.charged = "charged";
    this.uncharging = "uncharging";
    this.XOffset = 65;
    this.YOffset = 62;

    this.sprite.Load("gfx/standmeter.anm2", true);
  }
}
