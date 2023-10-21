import {Pucci} from './scripts/Pucci';
import {upgradeMod} from 'isaacscript-common';

const MOD_NAME = "whitesnake";

export function main(): void {
  const vanillaMod = RegisterMod(MOD_NAME, 1);
  const mod = upgradeMod(vanillaMod);

  const pucci = new Pucci(mod);

  Isaac.DebugString(`${MOD_NAME} initialized.`);
}
