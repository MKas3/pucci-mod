import type { ModUpgraded } from "isaacscript-common";
import { Stand } from "./Stand";

export class Whitesnake extends Stand {
  constructor(mod: ModUpgraded) {
    super(mod, {
      type: Isaac.GetEntityTypeByName("The Whitesnake"),
      variant: Isaac.GetEntityVariantByName("The Whitesnake"),
      particleType: Isaac.GetEntityTypeByName("TW Particle"),
      particle: Isaac.GetEntityVariantByName("TW Particle"),
      floatOffset: Vector(0, -36),
      animations: {
        idle: ["IdleE", "IdleS", "IdleW", "IdleN"],
        mad: ["MadE", "MadS", "MadW", "MadN"],
        wind: ["Wind2E", "Wind2S", "Wind2W", "Wind2N"],
        wound: ["Wound2E", "Wound2S", "Wound2W", "Wound2N"],
        flash: ["FlashE", "FlashS", "FlashW", "FlashN"],
        ready: ["ReadyE", "ReadyS", "ReadyW", "ReadyN"],
        rush: ["RushE", "RushS", "RushW", "RushN"],
        punch: ["PunchE", "PunchS", "PunchW", "PunchN"],
        ora: ["OraE", "OraS", "OraW", "OraN"],
        particle: ["ParticleE", "ParticleS", "ParticleW", "ParticleN"],
      },
    });
  }
}
