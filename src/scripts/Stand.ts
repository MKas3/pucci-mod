import type { EntityType } from "isaac-typescript-definitions";
import type { ModUpgraded } from "isaacscript-common";
import { ModContent } from "../types/ModContent";

type AnimationDirections = [string, string, string, string];

interface Animations {
  idle: AnimationDirections;
  mad: AnimationDirections;
  wind: AnimationDirections;
  wound: AnimationDirections;
  flash: AnimationDirections;
  ready: AnimationDirections;
  rush: AnimationDirections;
  punch: AnimationDirections;
  ora: AnimationDirections;
  particle: AnimationDirections;
}

interface StandProps {
  type: EntityType;
  variant: number;
  particleType: EntityType;
  particle: number;
  floatOffset: Vector;
  animations: Animations;
}

export class Stand extends ModContent {
  type: EntityType;
  variant: number;
  particleType: EntityType;
  particle: number;
  floatOffset: Vector;
  animations: Animations;

  constructor(mod: ModUpgraded, props: StandProps) {
    super(mod);
    this.type = props.type;
    this.variant = props.variant;
    this.particleType = props.particleType;
    this.particle = props.particle;
    this.floatOffset = props.floatOffset;
    this.animations = props.animations;
  }
}
