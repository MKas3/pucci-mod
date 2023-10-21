import type { PlayerType } from "isaac-typescript-definitions";
import type { ModUpgraded } from "isaacscript-common";
import type { EntityWithData } from "../types/EntityWithData";
import { ModContent } from "../types/ModContent";
import type { Stand } from "./Stand";

interface StandOwnerProps {
  stand: Stand;
  playerName: string;
}

interface StandData {
  linked?: boolean;
  ready?: boolean;
  behavior?: "idle" | "rush" | "ora" | "return";
  behaviorlast?: "idle" | "rush" | "ora" | "return" | "none";
  tgttimer?: number;
  charge?: number;
  maxcharge?: number;
  range?: number;
  launchdir?: Vector;
  launchto?: Vector;
  launchpos?: Vector;
  launchtgt?: Vector;
  statetime?: number;
  posrate?: number;
  alpha?: number;
  alphagoal?: number;
  punchtear?: Entity;
  tgt?: Entity;
  punches?: number;
  maxpunches?: number;
  damage?: number;
  Position?: Vector;
  Velocity?: Vector;
  [key: string]: unknown;
}

export interface StandOwnerData {
  stand?: EntityWithData<StandData>;
  releasedir?: Vector;
  standstill?: number;
  shootpress?: boolean;
  shootrelease?: boolean;
  shoot?: boolean;
  mytgt?: Entity;
  tether?: Entity[];
  friend?: Entity;
  tgthp?: number;
  givenkey?: boolean;
  keysspawned?: boolean;
  keyspawnpos?: Vector;
  usedbox?: boolean;
  rage?: boolean;
  [key: string]: unknown;
}

export class StandOwner extends ModContent {
  protected player?: EntityPlayer;
  protected playerType?: PlayerType;
  protected ownerPlayerType?: PlayerType;
  protected stand: Stand;

  constructor(mod: ModUpgraded, props: StandOwnerProps) {
    super(mod);
    this.stand = props.stand;
    this.ownerPlayerType = Isaac.GetPlayerTypeByName(props.playerName);
  }

  protected IsOwner(): boolean {
    return this.ownerPlayerType === this.playerType;
  }

  protected GetData(): StandOwnerData | undefined {
    return this.player?.GetData() as StandOwnerData;
  }
}
