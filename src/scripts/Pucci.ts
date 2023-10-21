import type { NullItemID } from "isaac-typescript-definitions";
import {
  ButtonAction,
  CacheFlag,
  CollectibleType,
  DamageFlag,
  EntityCollisionClass,
  EntityFlag,
  EntityGridCollisionClass,
  EntityType,
  Keyboard,
  ModCallback,
  Mouse,
  TearFlag,
} from "isaac-typescript-definitions";
import type { ModUpgraded } from "isaacscript-common";
import {
  ModCallbackCustom,
  addFlag,
  bitFlags,
  game,
  getRandomInt,
  hasFlag,
  lerp,
} from "isaacscript-common";
import { StandMeter } from "./StandMeter";
import { StandOwner } from "./StandOwner";
import { Whitesnake } from "./Whitesnake";

const TWbal = {
  ReapplyCostume: true,
  VisibleTarget: false,
  ForceSeed: false,
  DioOnly: true,
  NoShooting: false,

  ChargeLength: 4,
  RangeMult: 3,
  MinimumRange: 25,
  Punches: 15,
  Damage: 1.9,
  DamageLastHit: 3.4,
  DamageBirthrightFinisher: 1.5,
  DamageBirthrightFinisherB: 1.8,
  Knockback: 5,
  KnockbackLastHitMult: 2.5,
  KnockbackBirthrightMult: 5,
  KnockbackBossMult: 0.5,
  LockonWidth: 50,
  ExtraTargetRange: 25,
  ExtraTargetRangeBonus: 20,
  PunchSize: 8,

  NoShootingChargeMult: 0.4,
  PunchesPerExtraShot: 5,
  HomingTargetRangeBonus: 100,
  BFFDamageBonus: 1.9,
  ProptosisRangeMult: 0.5,
  ChocolateMilkChargeMult: 1,
  BrimstoneChargeMult: 0.4,
  BrimstonePlayerDamageMult: 0.75,
  DrFetusChargeMax: 3,
  EpicFetusChargeMult: 1,
  ParasiteDamageMult: 0.5,
  CricketsBodyDamageMult: 0.33,
  BoxOfFriendsPunchesMult: 2,
  SoyMilkPunchesMult: 20,
  LudovicoRangeBonus: 100,
  PiscesKnockbackMult: 2,
  IpecacChargeMult: 0.5,
  IpecacDamageMod: 0.5,
  MagnetForce: 8,
  MonstrosLungChargeMult: 0.5,
  RagePunchMult: 1,

  BossFriendRate: 0.15,
  AngelFriendRate: 0.35,
  ItemReviveRate: 0.35,
  LuckBonus: 0.03,

  FriendTargetHealth: 20,
  FriendTargetBonus: 3,
  FriendRecoverRate: 0.75,
  FriendHealthFalloff: 0.8,
  FriendMaxDamage: 7,
  MaxCharmedSpawns: 3,
  FriendHitPointTax: 10,

  BFFFriendBonus: 2,

  TaintRange: 120,
  TaintRangeBonus: 2.5,
} as const;

const stand = {
  savedTime: 0,
  Freeze: 0,
  room2: -1,
  zeroV: Vector(0, 0),
  randomV: Vector(0, 0),
  currentP: 0,

  StandCharge: 0,
  StandKey: Keyboard.LEFT_SHIFT,
  StandActive: false,
  StandGainPoints: 0.25,
  StandCooldown: 0,
  StandCooldownPoints: 10,
  StandOn: true,
  StandCooldownOn: false,
};

const TWrng = RNG();

const ControllerOn = true;
let gameunpause = false;
let roomframes = 0;
let beggars: Entity[] = [];

const chal1 = false;

let StandIsCharged = false;

function VecDir(vec: Vector) {
  return Math.floor((vec.GetAngleDegrees() % 360) / 90 + 0.5) % 4;
}

function IsTargetable(en: Entity) {
  let player = Isaac.GetPlayer(0);
  if (en && en.Exists() && en.Type === 4) {
    // punch bomb
    return true;
  }
  return false;
}

function CanPush(en: Entity) {
  return en && en.Type === 4 && !en.GetSprite().IsPlaying("Explode"); // bomb
}

function IsValidEnemy(en: Entity) {
  return (
    en &&
    ((en.IsVulnerableEnemy() && en.HitPoints > 0) || CanPush(en)) &&
    !en.HasEntityFlags(EntityFlag.FRIENDLY)
  );
}

function AdjPos(dir: Vector, en: Entity) {
  return en.Position.add(Vector(0, 0).add(dir.mul(en.Size + 45)));
}

export class Pucci extends StandOwner {
  costume: NullItemID;
  StMeter: StandMeter;

  constructor(mod: ModUpgraded) {
    const stand = new Whitesnake(mod);
    super(mod, { stand, playerName: "Pucci" });
    this.costume = Isaac.GetCostumeIdByPath(
      "gfx/characters/character_pucci.anm2",
    );
    this.StMeter = new StandMeter(mod);
  }

  override AddCallbacks(mod: ModUpgraded): void {
    mod.AddCallback(ModCallback.POST_PLAYER_INIT, () => {
      const player = Isaac.GetPlayer();
      this.player = player;
      this.playerType = player.GetPlayerType();

      if (this.IsOwner()) {
        player.EvaluateItems();
        player.AddNullCostume(this.costume);
      }
    });

    mod.AddCallback(ModCallback.POST_UPDATE, () => {
      if (this.player && this.IsOwner()) {
        const { player } = this;
        const data = this.GetData();
        if (!data) {
          return;
        }
        if (!data.stand || !data.stand.Exists()) {
          data.stand = Isaac.Spawn(
            this.stand.type,
            this.stand.variant,
            0,
            player.Position,
            Vector(0, 0),
            player,
          );
        }
        if (data.stand && data.stand.Exists()) {
          const twd = data.stand.GetData();
          twd.linked = true;
          const tws = data.stand.GetSprite();
          const ppos = player.Position;
          const pvel = player.Velocity;
          let shootdir = player.GetShootingInput();

          if (
            Input.IsMouseBtnPressed(Mouse.BUTTON_LEFT) &&
            shootdir.X === 0 &&
            shootdir.Y === 0
          ) {
            shootdir = Vector(-1, 0).Rotated(player.GetHeadDirection() * 90);
          }

          let xx = shootdir.X;
          let yy = shootdir.Y;

          if (yy > 0.5) {
            yy = 1;
            xx = 0;
          } else if (yy < -0.5) {
            yy = -1;
            xx = 0;
          } else {
            yy = 0;
            if (xx > 0.5) {
              xx = 1;
            } else if (xx < -0.5) {
              xx = -1;
            } else {
              xx = 0;
            }
          }

          shootdir = Vector(xx, yy);

          const movedir = player.GetMovementInput();
          const isclear = game.GetRoom().IsClear();

          if (!twd.behavior) {
            data.stand.PositionOffset = this.stand.floatOffset;
            data.releasedir = Vector(0, 0);
            data.standstill = 0;
            twd.tgttimer = 0;
            twd.charge = player.MaxFireDelay * TWbal.ChargeLength;
            twd.maxcharge = player.MaxFireDelay * TWbal.ChargeLength;
            twd.range = 150;
            twd.launchdir = Vector(0, 0);
            twd.launchto = data.stand.Position;
            twd.behavior = "idle";
            twd.behaviorlast = "none";
            twd.statetime = 0;
            twd.posrate = 0.08;
            twd.alpha = -3;
            twd.alphagoal = -3;
          }

          if (
            data.standstill !== undefined &&
            player.GetMovementInput().X === 0 &&
            player.GetMovementInput().Y === 0
          ) {
            data.standstill++;
          } else {
            data.standstill = 0;
          }

          if (TWbal.NoShooting && data.standstill < 140) {
            player.FireDelay = 10;
          }

          data.shootpress = false;
          data.shootrelease = false;
          if (
            shootdir.Length() !== 0 ||
            Input.IsMouseBtnPressed(Mouse.BUTTON_LEFT) ||
            player.AreOpposingShootDirectionsPressed()
          ) {
            if (data.shoot === false) {
              data.shootpress = true;
            }
            data.shoot = true;
            data.releasedir = shootdir;
          } else {
            if (data.shoot === true) {
              data.shootrelease = true;
            }
            data.shoot = false;
          }

          if (TWbal.VisibleTarget && !(data.mytgt && data.mytgt.Exists())) {
            data.mytgt = Isaac.Spawn(1000, 30, 0, ppos, Vector(0, 0), player);
            data.mytgt.RenderZOffset = -10_000;
            data.mytgt.GetSprite().Color = Color(
              191 / 255,
              218 / 255,
              224 / 255,
              0.6,
              0,
              0,
              0,
            );
          }

          const floatbounce = 3 * Vector.FromAngle(data.stand.FrameCount * 9).Y;
          data.stand.PositionOffset = this.stand.floatOffset.add(
            Vector(0, floatbounce),
          );

          if (twd.punchtear && twd.punchtear.Exists()) {
            twd.punchtear.Remove();
          }

          switch (twd.behavior) {
            case "idle": {
              twd.alphagoal = 0.5;
              // position
              let twang =
                (ppos
                  .add(Vector(0, -1))
                  .sub(data.stand.Position)
                  .GetAngleDegrees() +
                  180) %
                360;
              let tgtang = player.GetHeadDirection() * 90;
              if (player.HasCollectible(329)) {
                tgtang = shootdir.GetAngleDegrees();
              }
              if (twang - 180 > tgtang) {
                twang -= 360;
              }
              if (tgtang - 180 > twang) {
                tgtang -= 360;
              }
              if (data.shoot) {
                twd.posrate = 0.2;
              }
              let nextang = lerp(twang, tgtang, twd.posrate as float);
              twd.posrate = 0.08;
              let nextpos = ppos
                .add(Vector(0, -1))
                .add(Vector.FromAngle(nextang).mul(45));

              data.stand.Velocity = nextpos.sub(data.stand.Position);

              let closedist = -player.TearHeight * TWbal.RangeMult + 40;
              let found = false;
              let safe = true;
              const entites = Isaac.GetRoomEntities();
              for (let en of entites) {
                if (en && (IsValidEnemy(en) || IsTargetable(en))) {
                  let xdif = en.Position.X - player.Position.X;
                  let ydif = en.Position.Y - player.Position.Y;
                  if (data.releasedir && data.releasedir.Y === 0) {
                    if (
                      data.releasedir.X * xdif > 0 &&
                      Math.abs(ydif) < TWbal.LockonWidth &&
                      Math.abs(xdif) < closedist
                    ) {
                      found = true;
                      safe = false;
                      twd.tgt = en;
                      closedist = Math.abs(xdif);
                    }
                  } else if (
                    data.releasedir &&
                    data.releasedir.Y * ydif > 0 &&
                    Math.abs(xdif) < TWbal.LockonWidth &&
                    Math.abs(ydif) < closedist
                  ) {
                    found = true;
                    safe = false;
                    twd.tgt = en;
                    closedist = Math.abs(ydif);
                  }
                }
              }
              if (found) {
                twd.alphagoal = 1;
                twd.tgttimer = 10;
              } else if (
                twd.tgttimer &&
                twd.tgt &&
                twd.tgttimer > 0 &&
                (IsValidEnemy(twd.tgt) || IsTargetable(twd.tgt))
              ) {
                twd.tgttimer--;
              } else {
                twd.tgt = undefined;
              }

              let maxcharge = player.MaxFireDelay * TWbal.ChargeLength;
              if (player.HasCollectible(69)) {
                maxcharge *= TWbal.ChocolateMilkChargeMult;
              }
              if (player.HasCollectible(118)) {
                maxcharge *= TWbal.BrimstoneChargeMult;
              }
              if (player.HasCollectible(168)) {
                maxcharge *= TWbal.EpicFetusChargeMult;
              }
              if (player.HasCollectible(149)) {
                maxcharge *= TWbal.IpecacChargeMult;
              }
              if (player.HasCollectible(229)) {
                maxcharge *= TWbal.MonstrosLungChargeMult;
              }
              if (TWbal.NoShooting) {
                maxcharge *= TWbal.NoShootingChargeMult;
              }

              let spfaceind = (player.GetHeadDirection() + 2) % 4;
              let spaimind = (player.GetHeadDirection() + 2) % 4;
              if (player.HasCollectible(329)) {
                spfaceind = VecDir(shootdir) + 1;
                spaimind = VecDir(shootdir) + 1;
              }

              if (data.shoot) {
                twd.range = -player.TearHeight * TWbal.RangeMult;
                if (player.HasCollectible(261)) {
                  twd.range *= TWbal.ProptosisRangeMult;
                }
                twd.range = Math.max(twd.range, TWbal.MinimumRange);
                if (player.HasCollectible(329)) {
                  twd.range += TWbal.LudovicoRangeBonus;
                }
                twd.launchto = game
                  .GetRoom()
                  .GetClampedPosition(
                    ppos.add(
                      data
                        .releasedir!.mul(twd.range)
                        .add(
                          player.GetTearMovementInheritance(shootdir).mul(10),
                        ),
                    ),
                    20,
                  );
                if (twd.charge && twd.charge > 0) {
                  tws.Play(this.stand.animations.wind[spaimind]!, false);
                } else if (tws.IsEventTriggered("WindEnd")) {
                  tws.Play(this.stand.animations.wound[spaimind]!, false);
                } else if (twd.charge && twd.charge === 0 && !twd.ready) {
                  tws.Play(this.stand.animations.flash[spaimind]!, false);
                  twd.ready = true;
                  // sfx.Play(snd.punchready, 0.35, 0, false, 0.98);
                } else if (tws.IsEventTriggered("FlashEnd")) {
                  tws.Play(this.stand.animations.ready[spaimind]!, false);
                }
                if (
                  tws.IsPlaying("Wound2E") ||
                  tws.IsPlaying("Wound2S") ||
                  tws.IsPlaying("Wound2W") ||
                  tws.IsPlaying("Wound2N")
                ) {
                  tws.Play(this.stand.animations.wound[spaimind]!, false);
                }
                if (
                  tws.IsPlaying("ReadyE") ||
                  tws.IsPlaying("ReadyS") ||
                  tws.IsPlaying("ReadyW") ||
                  tws.IsPlaying("ReadyN")
                ) {
                  tws.Play(this.stand.animations.ready[spaimind]!, false);
                }
                twd.charge &&= Math.max(0, twd.charge - 1);
                if (roomframes <= 1) {
                  twd.charge = 0;
                }
              } else {
                if (isclear) {
                  tws.Play(this.stand.animations.idle[spfaceind]!, false);
                } else {
                  tws.Play(this.stand.animations.mad[spfaceind]!, false);
                }
                if (twd.charge === 0) {
                  twd.charge = maxcharge;
                  twd.behavior = "rush";
                  twd.launchdir = data.releasedir;
                  if (
                    twd.launchdir &&
                    twd.launchdir.X === 0 &&
                    twd.launchdir.Y === 0
                  ) {
                    twd.launchdir = Vector(1, 0);
                  }

                  data.tether = [];
                  for (let i = 1; i <= 8; i++) {
                    let newtear = Isaac.Spawn(
                      2,
                      0,
                      0,
                      player.Position,
                      Vector(0, 0),
                      player,
                    );
                    let totear = newtear.ToTear();
                    if (totear) {
                      totear.Height = -12;
                      totear.FallingSpeed = 0;
                      totear.TearFlags = addFlag(
                        totear.TearFlags,
                        TearFlag.PIERCING,
                      );
                      totear.TearFlags = addFlag(
                        totear.TearFlags,
                        TearFlag.SPECTRAL,
                      );
                    }
                    newtear.CollisionDamage = 1;
                    data.tether[i] = newtear;
                  }
                }
                twd.charge &&= Math.min(maxcharge, twd.charge + maxcharge / 90);
                twd.ready = false;
                if (
                  data.releasedir &&
                  (roomframes < 1 || !player.HasCollectible(329))
                ) {
                  twd.launchto = game
                    .GetRoom()
                    .GetClampedPosition(
                      ppos.add(
                        data.releasedir
                          .mul(twd.range ?? 1)
                          .add(
                            player
                              .GetTearMovementInheritance(data.releasedir)
                              .mul(10),
                          ),
                      ),
                      20,
                    );
                }
              }

              // idle tgt
              if (data.mytgt && data.mytgt.Exists()) {
                data.mytgt.Position = twd.tgt
                  ? twd.tgt.Position
                  : twd.launchto ?? Vector(0, 0);
              }

              break;
            }

            case "rush": {
              twd.alphagoal = 1;
              // init rush
              if (twd.statetime === 0) {
                twd.launchpos = data.stand.Position;
                twd.launchtgt = twd.launchto;
                if (twd.launchdir) {
                  if (twd.launchdir.Y === -1) {
                    tws.Play(this.stand.animations.rush[3], false);
                  } else if (twd.launchdir.X === 1) {
                    tws.Play(this.stand.animations.rush[0], false);
                  } else if (twd.launchdir.Y === 1) {
                    tws.Play(this.stand.animations.rush[1], false);
                  } else if (twd.launchdir.X === -1) {
                    tws.Play(this.stand.animations.rush[2], false);
                  } else {
                    tws.Play(this.stand.animations.rush[3], false);
                  }
                }
              }
              // intercept target
              if (twd.launchdir && twd.launchto) {
                let entities = Isaac.GetRoomEntities();
                for (let en of entities) {
                  if (IsValidEnemy(en)) {
                    let dest = AdjPos(twd.launchdir.mul(-1), en);
                    let diff = data.stand.Position.sub(dest);
                    if (
                      diff.Length() < 45 &&
                      diff.Length() <
                        data.stand.Position.sub(twd.launchto).Length()
                    ) {
                      twd.tgt = en;
                      twd.launchto = dest;
                    }
                  }
                }
              }

              // engage target
              if (
                twd.tgt &&
                !(IsValidEnemy(twd.tgt) || IsTargetable(twd.tgt))
              ) {
                twd.tgt = undefined;
              }
              if (twd.tgt && twd.launchdir) {
                let dest2 = AdjPos(twd.launchdir.mul(-1), twd.tgt);
                twd.launchto = dest2;
              } else {
                twd.launchto = twd.launchtgt;
              }

              // velocity
              if (twd.launchto) {
                const diff2 = twd.launchto.sub(data.stand.Position);
                data.stand.Velocity = diff2
                  .Normalized()
                  .mul(Math.min(25, diff2.Length()));
                if (diff2.Length() < 15) {
                  twd.behavior = twd.tgt ? "ora" : "ora";
                }
              }

              const fade = Isaac.Spawn(
                this.stand.particleType,
                this.stand.particle,
                0,
                data.stand.Position,
                Vector(0, 0),
                undefined,
              );

              const fs = fade.GetSprite();
              fade.PositionOffset = data.stand.PositionOffset;
              if (twd.launchdir) {
                if (twd.launchdir.Y === -1) {
                  fs.Play(this.stand.animations.particle[3], false);
                } else if (twd.launchdir.X === 1) {
                  fs.Play(this.stand.animations.particle[0], false);
                } else if (twd.launchdir.Y === 1) {
                  fs.Play(this.stand.animations.particle[1], false);
                } else if (twd.launchdir.X === -1) {
                  fs.Play(this.stand.animations.particle[2], false);
                }
              }

              fs.Color = Color(1, 1, 1, 0.25, 0, 0, 0);

              if (twd.launchto && data.mytgt && data.mytgt.Exists()) {
                data.mytgt.Position = twd.launchto;
              }

              break;
            }

            case "ora": {
              twd.alphagoal = 1;
              // init
              if (twd.launchdir && twd.statetime === 0) {
                if (twd.launchdir.Y === -1) {
                  tws.Play(this.stand.animations.ora[3], false);
                } else if (twd.launchdir.X === 1) {
                  tws.Play(this.stand.animations.ora[0], false);
                } else if (twd.launchdir.Y === 1) {
                  tws.Play(this.stand.animations.ora[1], false);
                } else if (twd.launchdir.X === -1) {
                  tws.Play(this.stand.animations.ora[2], false);
                }
                twd.punches = 0;
                twd.maxpunches =
                  TWbal.Punches + Math.ceil((player.ShotSpeed - 1) * 4);
                if (player.HasCollectible(245)) {
                  twd.maxpunches += TWbal.PunchesPerExtraShot;
                }
                if (player.HasCollectible(153)) {
                  twd.maxpunches += TWbal.PunchesPerExtraShot * 3;
                }
                if (player.HasCollectible(2)) {
                  twd.maxpunches += TWbal.PunchesPerExtraShot * 2;
                }
                if (data.usedbox) {
                  twd.maxpunches *= TWbal.BoxOfFriendsPunchesMult;
                }
                if (player.HasCollectible(330)) {
                  twd.maxpunches *= TWbal.SoyMilkPunchesMult;
                }
                if (data.rage) {
                  twd.maxpunches *= TWbal.RagePunchMult;
                }
                twd.damage = 1;
                if (player.HasCollectible(247)) {
                  twd.damage *= TWbal.BFFDamageBonus;
                }
                if (player.HasCollectible(104)) {
                  twd.damage *= TWbal.ParasiteDamageMult;
                }
                if (player.HasCollectible(224)) {
                  twd.damage *= TWbal.CricketsBodyDamageMult;
                }
                if (player.HasCollectible(149)) {
                  twd.damage *= TWbal.IpecacDamageMod;
                }
              }

              if (twd.tgt && !twd.tgt.Exists()) {
                twd.tgt = undefined;
              }

              if (
                twd.punches &&
                twd.maxpunches &&
                twd.tgt &&
                twd.punches < twd.maxpunches &&
                !(IsValidEnemy(twd.tgt) || IsTargetable(twd.tgt))
              ) {
                twd.tgt = undefined;
                let maxdist =
                  TWbal.ExtraTargetRange +
                  player.MoveSpeed * TWbal.ExtraTargetRangeBonus;
                // if (player.HasCollectible(3) || player.HasCollectible(182) ||
                // player.HasCollectible(331) || player.GetEffects().HasCollectibleEffect(192)) {
                // maxdist = maxdist + TWbal.HomingTargetRangeBonus; }
                if (hasFlag(player.TearFlags, TearFlag.HOMING)) {
                  maxdist += TWbal.HomingTargetRangeBonus;
                }
                let dist = maxdist;
                if (twd.launchdir) {
                  let entities = Isaac.GetRoomEntities();
                  for (let en of entities) {
                    if (IsValidEnemy(en)) {
                      let dest = AdjPos(twd.launchdir.mul(-1), en);
                      dist = data.stand.Position.sub(dest).Length();
                      if (dist < maxdist) {
                        twd.tgt = en;
                        maxdist = dist;
                      }
                    }
                  }
                }
              }

              if (twd.tgt && twd.launchdir) {
                data.stand.Velocity = AdjPos(
                  twd.launchdir.mul(-1),
                  twd.tgt,
                ).sub(data.stand.Position);
                if (
                  twd.tgt.Type === 4 &&
                  twd.tgt.Variant !== 3 &&
                  twd.tgt.Variant !== 4 &&
                  (twd.tgt.Position.sub(player.Position).Length() > 80 ||
                    player.HasCollectible(52))
                ) {
                  let roomEntities = Isaac.GetRoomEntities();
                  for (let gt = 1; gt <= roomEntities.length; gt++) {
                    let av = roomEntities[gt - 1];
                    if (
                      av &&
                      av.IsVulnerableEnemy() &&
                      av.Type !== 33 &&
                      !av.HasEntityFlags(EntityFlag.FRIENDLY) &&
                      av.Position.sub(twd.tgt.Position).Length() < av.Size + 35
                    ) {
                      twd.tgt.ToBomb()?.SetExplosionCountdown(0);
                      twd.tgt = undefined;
                      break;
                    }
                  }
                }
              } else {
                data.stand.Velocity = data.stand.Velocity.mul(0.7);
              }

              // attack
              if (
                twd.statetime &&
                twd.punches &&
                twd.maxpunches &&
                twd.statetime % 4 === 0 &&
                twd.punches < twd.maxpunches
              ) {
                let diff = data.stand.Position.sub(player.Position);
                let twinrange =
                  diff.Length() <
                  TWbal.TaintRange + player.TearHeight * -TWbal.TaintRangeBonus;
                twd.punches++;

                if (twinrange) {
                  if (twd.punches >= twd.maxpunches) {
                    twd.punches = 0;
                  }
                } else {
                  twd.punches = twd.maxpunches;
                  if (data.tether) {
                    for (let i = 1; i <= 6; i++) {
                      let tearent = data.tether[i];
                      if (tearent && tearent.Exists()) {
                        tearent.Velocity = Vector(6, 0).Rotated(
                          Math.random() * 360,
                        );
                        const tear = tearent.ToTear();
                        if (tear) {
                          tear.FallingSpeed = -15;
                          tear.FallingAcceleration = 2;
                        }
                      }
                    }
                    data.tether = undefined;
                  }
                }

                if (
                  !twd.tgt ||
                  (twd.tgt && IsTargetable(twd.tgt) && !IsValidEnemy(twd.tgt))
                ) {
                  twd.punches = twd.maxpunches;
                }

                if (twd.launchdir && twd.punches === twd.maxpunches) {
                  if (twd.launchdir.Y === -1) {
                    tws.Play(this.stand.animations.punch[3], false);
                  } else if (twd.launchdir.X === 1) {
                    tws.Play(this.stand.animations.punch[0], false);
                  } else if (twd.launchdir.Y === 1) {
                    tws.Play(this.stand.animations.punch[1], false);
                  } else if (twd.launchdir.X === -1) {
                    tws.Play(this.stand.animations.punch[2], false);
                  }
                }

                if (twd.launchdir) {
                  let hitpos = data.stand.Position.add(twd.launchdir.mul(35));
                  if (
                    !player.HasCollectible(149) &&
                    (!player.HasCollectible(401) ||
                      TWrng.RandomInt(100) > 10 + player.Luck * 2)
                  ) {
                    let ref = player.FireTear(
                      hitpos,
                      Vector(0, 0),
                      false,
                      false,
                      false,
                    );
                    ref.TearFlags = addFlag(ref.TearFlags, TearFlag.HOMING);
                    let isfinisher =
                      player.HasCollectible(619) &&
                      twd.punches + 3 > twd.maxpunches;
                    if (
                      twd.damage &&
                      (twd.punches === twd.maxpunches || isfinisher)
                    ) {
                      ref.CollisionDamage =
                        twd.punches === twd.maxpunches
                          ? ref.CollisionDamage *
                            (twd.damage * TWbal.DamageLastHit)
                          : ref.CollisionDamage *
                            (twd.damage * TWbal.DamageBirthrightFinisher);
                      if (
                        twd.tgt && // sfx.Play(snd.punchheavy, .75, 0, false, 1);
                        player.HasCollectible(317) &&
                        twd.punches === twd.maxpunches
                      ) {
                        const splash = Isaac.Spawn(
                          1000,
                          53,
                          0,
                          twd.tgt.Position,
                          Vector(0, 0),
                          player,
                        );
                        splash.GetSprite().Scale = Vector(2, 2);
                      }
                    } else if (twd.damage) {
                      ref.CollisionDamage *= twd.damage * TWbal.Damage;
                      // if (twd.tgt) { sfx.Play(snd.punchlight, .75, 0, false, 1 + Math.min(.3,
                      // (.015 * twd.punches))); }
                    }
                    // if (!twd.tgt) { sfx.Play(snd.whoosh, 0.8, 0, false, 1); }
                    ref.Scale = TWbal.PunchSize;
                    ref.Height = -20;
                    ref.FallingSpeed = 0;
                    ref.GetSprite().Color = Color(0, 0, 0, 0, 0, 0, 0);
                    ref.GetSprite().Scale = Vector(0, 0);
                    twd.punchtear = ref;
                  } else if (twd.damage) {
                    let expdam = player.Damage * twd.damage;
                    if (player.HasCollectible(401)) {
                      expdam += 30;
                    }
                    Isaac.Explode(hitpos, player, expdam);
                  }

                  let knockback = player.ShotSpeed * TWbal.Knockback;
                  if (player.HasCollectible(309)) {
                    knockback *= TWbal.PiscesKnockbackMult;
                  }
                  let magnet = player.HasCollectible(315);
                  for (let i = 0; i < Isaac.GetRoomEntities().length; i++) {
                    let en = Isaac.GetRoomEntities()[i];
                    if (en && IsValidEnemy(en)) {
                      let bossmult = 1;
                      if (en.IsBoss()) {
                        bossmult = TWbal.KnockbackBossMult;
                      }
                      let length = en.Position.sub(hitpos).Length();
                      if (length <= 50) {
                        if (player.HasCollectible(619)) {
                          en.AddConfusion(EntityRef(player), 40, false);
                        } else {
                          en.AddConfusion(EntityRef(player), 10, false);
                        }
                        if (twd.punches === twd.maxpunches) {
                          en.Velocity = player.HasCollectible(619)
                            ? en.Velocity.add(
                                twd.launchdir.mul(
                                  bossmult *
                                    knockback *
                                    TWbal.KnockbackBirthrightMult,
                                ),
                              )
                            : en.Velocity.add(
                                twd.launchdir.mul(
                                  bossmult *
                                    knockback *
                                    TWbal.KnockbackLastHitMult,
                                ),
                              );
                        } else {
                          en.Velocity = en.Velocity.add(
                            twd.launchdir.mul(bossmult * knockback),
                          );
                        }
                      }
                      if (
                        length <= 150 &&
                        length >= 30 &&
                        magnet &&
                        !en.IsBoss()
                      ) {
                        en.Velocity = en.Velocity.add(
                          hitpos
                            .sub(en.Position)
                            .Normalized()
                            .mul(TWbal.MagnetForce),
                        );
                      }
                    }
                  }
                }
              }

              if (
                tws.IsFinished("PunchN") ||
                tws.IsFinished("PunchE") ||
                tws.IsFinished("PunchS") ||
                tws.IsFinished("PunchW")
              ) {
                twd.behavior = "return";
                if (data.tether) {
                  for (let i = 1; i <= 6; i++) {
                    let tearent = data.tether[i];
                    if (tearent && tearent.Exists()) {
                      tearent.Remove();
                    }
                  }
                  data.tether = undefined;
                }
              }

              break;
            }

            case "return": {
              if (twd.alpha && twd.alpha <= 0) {
                twd.behavior = "idle";
                twd.posrate = 1;
                twd.Position = player.Position;
                twd.Velocity = Vector(0, 0);
                twd.alpha = -3;
              } else {
                twd.alphagoal = -3;
                data.stand.Velocity = data.stand.Velocity.mul(0.8);
              }

              break;
            }
            // No default
          }

          // sprite alpha
          if (twd.alpha && twd.alphagoal) {
            if (twd.alpha < twd.alphagoal) {
              twd.alpha = Math.min(twd.alphagoal, twd.alpha + 0.35);
            } else if (twd.alpha > twd.alphagoal) {
              twd.alpha = Math.max(twd.alphagoal, twd.alpha - 0.35);
            }
          }

          if (twd.alpha) {
            if (twd.alpha <= 0) {
              data.stand.GetSprite().Scale = Vector(0, 0);
            } else if (player.HasCollectible(247)) {
              data.stand.GetSprite().Scale = Vector(1.2, 1.2);
            } else {
              data.stand.GetSprite().Scale = Vector(1, 1);
            }

            tws.Color = Color(1, 1, 1, Math.max(0, twd.alpha), 0, 0, 0);
          }

          // state timer
          if (
            twd.behavior &&
            twd.behaviorlast &&
            twd.behavior !== twd.behaviorlast
          ) {
            twd.behaviorlast = twd.behavior;
            twd.statetime = 0;
          } else {
            twd.statetime &&= twd.statetime + 1;
          }
        }

        // entitehe
        let charmcount = 0;
        let oldestNum = 0;
        let oldest: Entity | undefined;
        const entities = Isaac.GetRoomEntities();
        for (const en of entities) {
          let type = en.Type;
          let variant = en.Variant;
          let subtype = en.SubType;
          // no old tw
          if (
            type === this.stand.type &&
            variant === this.stand.variant &&
            !en.GetData()["linked"]
          ) {
            en.Remove();
          }
          // particle cleanup
          if (
            type === this.stand.particleType &&
            variant === this.stand.particle
          ) {
            en.GetSprite().Color = Color(
              1,
              1,
              1,
              0.3 * (1 / en.FrameCount),
              0,
              0,
              0,
            );
            if (en.FrameCount >= 3) {
              en.Remove();
            }
          }
          // boss death detect
          else if (en.IsBoss()) {
            // check if beggar exists
          } else if (
            type === 6 &&
            (variant === 4 || variant === 5 || variant === 7)
          ) {
            if (en.FrameCount === 1) {
              beggars.push(en);
            }
          }
          // turn idiot morphed stoneys back into fatties
          else if (type === 302 && en.GetData()["friend"]) {
            en.ToNPC()?.Morph(208, 0, 0, 1);
          }
          // limit max friends
          else if (
            data.friend &&
            en.IsEnemy() &&
            en.HasEntityFlags(EntityFlag.CHARM)
          ) {
            charmcount++;
            if (
              oldestNum === 0 ||
              (oldest && oldest.FrameCount < en.FrameCount)
            ) {
              oldest = en;
              oldestNum = -1;
            }
          }
          // turning second steam sale into quarter since it's too easy to get 2 with this mod and I
          // hate fun
          else if (
            subtype === 64 &&
            type === 5 &&
            variant === 100 &&
            player.HasCollectible(64)
          ) {
            en.ToPickup()?.Morph(5, 100, 74, true);
          }
          if (chal1 && type === 5 && variant === 10) {
            let pickup = en.ToPickup();
            if (pickup && pickup.IsShopItem()) {
              if (subtype !== 6) {
                pickup.Morph(5, 10, 6, true);
              }
            } else {
              Isaac.Spawn(3, 43, 0, en.Position, en.Velocity, player);
              en.Remove();
            }
          }
        }
        if (oldestNum !== 0 && oldest && charmcount > TWbal.MaxCharmedSpawns) {
          oldest.Kill();
        }

        // check if beggar paid out or died
        for (let i = 0; i < beggars.length; i++) {
          let v = beggars[i];
          if (v?.GetSprite().IsPlaying("Teleport")) {
            beggars.splice(i, 1);
            break;
          }
          if (!v?.Exists()) {
            beggars.splice(i, 1);
          }
        }

        // friend management
        if (
          data.friend &&
          roomframes > 1 &&
          (!data.friend.Exists() ||
            data.friend.HitPoints <= 0 ||
            data.friend.IsDead())
        ) {
          data.friend = undefined;
        }

        if (
          roomframes === 1 &&
          data.friend &&
          data.friend.HitPoints > 0 && // friend management
          data.friend &&
          !data.friend.Exists()
        ) {
          const spawn = Isaac.Spawn(
            data.friend.Type,
            data.friend.Variant,
            data.friend.SubType,
            Isaac.GetFreeNearPosition(player.Position, 40),
            Vector(0, 0),
            player,
          );
          spawn.HitPoints = data.friend.HitPoints;
          spawn.AddCharmed(EntityRef(player), 100_000);
          spawn.AddEntityFlags(EntityFlag.FRIENDLY);

          if (!game.GetRoom().IsClear()) {
            data.tgthp = (data.tgthp ?? 1) * TWbal.FriendHealthFalloff;
            spawn.HitPoints = lerp(
              data.friend.HitPoints - TWbal.FriendHitPointTax,
              data.tgthp,
              TWbal.FriendRecoverRate,
            );
          }

          data.friend = spawn;
        }
        roomframes++;

        // key check
        if (data.givenkey && !data.keysspawned) {
          data.keysspawned = true;
          if (!player.HasCollectible(238)) {
            player.AddCollectible(238, 0, true);
          }
          if (!player.HasCollectible(239)) {
            player.AddCollectible(239, 0, true);
          }
          player.AddCacheFlags(CacheFlag.ALL);
          player.EvaluateItems();
          Isaac.Spawn(
            3,
            28,
            0,
            data.keyspawnpos ?? Vector(0, 0),
            Vector(0, 0),
            player,
          );
        }
      }
    });

    mod.AddCallback(
      ModCallback.PRE_USE_ITEM,
      () => {
        const data = this.GetData();
        if (data) {
          data.usedbox = true;
        }
        return true;
      },
      357,
    );

    mod.AddCallbackCustom(ModCallbackCustom.POST_NEW_ROOM_REORDERED, () => {
      const { player } = this;
      if (!player) {
        return;
      }
      if (this.IsOwner()) {
        let data = this.GetData();
        if (!data) {
          return;
        }
        if (!data.stand || !data.stand.Exists()) {
          data.stand = Isaac.Spawn(
            this.stand.type,
            this.stand.variant,
            0,
            player.Position,
            Vector(0, 0),
            player,
          );
        }
        let twd = data.stand.GetData();
        let tws = data.stand.GetSprite();
        let tgtang = player.GetHeadDirection() * 90;
        let nextpos = player.Position.add(Vector(0, -1)).add(
          Vector.FromAngle(tgtang).mul(50),
        );
        roomframes = 0;
        beggars = [];

        twd.alphagoal = -2.5;
        twd.alpha = -2.5;
        twd.posrate = 1;
        if (twd.behavior !== null) {
          twd.behavior = "idle";
        }
        tws.Color = Color(1, 1, 1, -2.5, 0, 0, 0);
        data.usedbox = false;
        if (this.IsOwner()) {
          player.AddNullCostume(this.costume);
        }
        if (TWbal.ReapplyCostume && this.IsOwner()) {
          player.AddNullCostume(this.costume);
        }
      }
    });

    mod.AddCallback(ModCallback.POST_RENDER, () => {
      const { player } = this;
      if (!player) {
        return;
      }
      if (this.IsOwner() && stand.StandOn) {
        let room = Game().GetRoom();
        // Stand meter
        const { StMeter } = this;
        StMeter.sprite.SetOverlayRenderPriority(true);
        if (StandIsCharged) {
          StMeter.sprite.Play(StMeter.charged, false);
        } else {
          StMeter.sprite.SetFrame("charging", Math.floor(stand.StandCharge));
        }
        StMeter.sprite.Render(
          Vector(StMeter.XOffset, StMeter.YOffset),
          Vector(0, 0),
          Vector(0, 0),
        );
      }
    });

    mod.AddCallback(ModCallback.ENTITY_TAKE_DMG, () => {
      if (
        this.IsOwner() &&
        stand.StandOn &&
        !stand.StandActive &&
        stand.StandCharge < 20
      ) {
        stand.StandCharge += stand.StandGainPoints;
      }
      return undefined;
    });

    mod.AddCallback(ModCallback.POST_UPDATE, () => {
      const { player } = this;
      if (!player) {
        return;
      }
      let controler = player.ControllerIndex;
      let sfx = SFXManager();

      if (
        StandIsCharged &&
        (Input.IsButtonPressed(stand.StandKey, controler) ||
          (ControllerOn &&
            Input.IsActionTriggered(ButtonAction.DROP, controler)))
      ) {
        let player = Isaac.GetPlayer(0);
        stand.room2 = Game().GetLevel().GetCurrentRoomIndex();
        stand.Freeze = 165;
        // sfx.Play(snd.STOP_TIME, 2, 0, false, 1); let k = Math.random(4); if (k == 1) {
        // sfx.Play(snd.ZAWAR, 7, 0, false, 1); } else if (k == 2) { sfx.Play(snd.TOKIWA, 7, 0,
        // false, 1); } else if (k == 3) { sfx.Play(snd.TOKIWA2, 7, 0, false, 1); } else {
        // sfx.Play(snd.ZAWAR2, 7, 0, false, 1); }
        stand.savedTime = game.TimeCounter;
        // music.Disable();
        StandIsCharged = false;
        stand.StandCharge = 0;
        stand.StandActive = true;
        stand.StandCooldown = stand.StandCooldownPoints;
        return;
      }

      StandIsCharged = stand.StandCharge === 20;

      if (game.GetFrameCount() === 1) {
        stand.StandCharge = 0;
        Isaac.SaveModData(mod, tostring(0));
      }

      if (stand.StandActive && !stand.StandCooldownOn && stand.Freeze === 0) {
        // music.Enable();
        stand.StandCooldownOn = true;
      }

      if (stand.StandCooldownOn) {
        if (stand.StandCooldown === 0) {
          stand.StandCooldownOn = false;
          stand.StandActive = false;
        }
        if (stand.StandCooldown > 0) {
          stand.StandCooldown--;
        }
      }

      // // Sound 1 if (Input.IsButtonPressed(SoundButtons.A, controler) == true &&
      // player.GetPlayerType() == TaintedDioType && player.GetPlayerType() != DioType) { let k =
      // Math.random(1); if (k == 1) { sfx.Play(snd.Wryyyyy2, 2, 0, false, 1); } else {
      // sfx.Play(snd.Wryyyyy, 2, 0, false, 1); } }

      // // Sound 2 if (Input.IsButtonPressed(SoundButtons.B, controler) == true &&
      // player.GetPlayerType() == TaintedDioType && player.GetPlayerType() != DioType) { let k =
      // Math.random(1); if (k == 1) { sfx.Play(snd.Laugh2, 2, 0, false, 1); } else {
      // sfx.Play(snd.Laugh, 2, 0, false, 1); } }

      // // Sound 3 if (Input.IsButtonPressed(SoundButtons.C, controler) == true &&
      // player.GetPlayerType() == TaintedDioType && player.GetPlayerType() != DioType) {
      // sfx.Play(snd.Hjiaku, 2, 0, false, 1); }
    });

    mod.AddCallback(ModCallback.POST_UPDATE, () => {
      const { player } = this;
      if (!player) {
        return;
      }
      let entities = Isaac.GetRoomEntities();
      if (stand.room2 !== Game().GetLevel().GetCurrentRoomIndex()) {
        stand.Freeze = 0;
      }
      if (stand.Freeze === 1) {
        for (let v of entities) {
          if (v && v.HasEntityFlags(EntityFlag.FREEZE)) {
            v.ClearEntityFlags(EntityFlag.FREEZE);
            switch (v.Type) {
              case EntityType.TEAR: {
                let data = v.GetData();
                if (data["Frozen"]) {
                  data["Frozen"] = undefined;
                  let tear = v.ToTear();
                  v.Velocity = data["StoredVel"] as Vector;
                  tear = v.ToTear();
                  if (tear) {
                    tear.FallingSpeed = data["StoredFall"] as float;
                    tear.FallingAcceleration = data["StoredAcc"] as float;
                  }
                }

                break;
              }

              case EntityType.LASER: {
                let data = v.GetData();
                data["Frozen"] = undefined;

                break;
              }

              case EntityType.KNIFE: {
                let data = v.GetData();
                data["Frozen"] = undefined;

                break;
              }
              // No default
            }
          }
        }
        stand.Freeze--;
      } else if (stand.Freeze > 1) {
        game.TimeCounter = stand.savedTime;
        for (let v of entities) {
          if (v.Type !== EntityType.PLAYER && v.Type !== EntityType.FAMILIAR) {
            if (
              v.Type !== EntityType.PROJECTILE &&
              !v.HasEntityFlags(EntityFlag.FREEZE)
            ) {
              v.AddEntityFlags(EntityFlag.FREEZE);
            }
            switch (v.Type) {
              case EntityType.TEAR: {
                let data = v.GetData();
                if (data["Frozen"]) {
                  let tear = v.ToTear();
                  v.Velocity = stand.zeroV;
                  if (tear) {
                    tear.FallingAcceleration = -0.1;
                    tear.FallingSpeed = 0;
                  }
                } else if (
                  v.Velocity.X !== 0 ||
                  v.Velocity.Y !== 0 ||
                  !player.HasCollectible(CollectibleType.ANTI_GRAVITY)
                ) {
                  data["Frozen"] = true;
                  data["StoredVel"] = v.Velocity;
                  let tear = v.ToTear();
                  if (tear) {
                    data["StoredFall"] = tear.FallingSpeed;
                    data["StoredAcc"] = tear.FallingAcceleration;
                  }
                } else {
                  let tear = v.ToTear();
                  if (tear) {
                    tear.FallingSpeed = 0;
                  }
                }

                break;
              }

              case EntityType.BOMB: {
                let bomb = v.ToBomb();
                if (bomb) {
                  bomb.SetExplosionCountdown(2);
                  if (v.Variant === 4) {
                    bomb.Velocity = stand.zeroV;
                  }
                }

                break;
              }

              case EntityType.LASER: {
                if (v.Variant !== 2) {
                  let laser = v.ToLaser();
                  let data = v.GetData();
                  if (laser) {
                    if (!data["Frozen"] && !laser.IsCircleLaser()) {
                      let newLaser = player.FireBrimstone(
                        Vector.FromAngle(laser.StartAngleDegrees),
                      );
                      newLaser.Position = laser.Position;
                      newLaser.DisableFollowParent = true;
                      let newData = newLaser.GetData();
                      newData["Frozen"] = true;
                      laser.CollisionDamage = -100;
                      data["Frozen"] = true;
                      laser.DisableFollowParent = true;
                      laser.Visible = false;
                    }
                    laser.SetTimeout(19);
                  }
                }

                break;
              }

              case EntityType.KNIFE: {
                let data = v.GetData();
                let knife = v.ToKnife();
                if (knife && knife.IsFlying()) {
                  let number = 1;
                  let offset = 0;
                  let offset2 = 0;
                  let brimDamage = 0;
                  if (player.HasCollectible(CollectibleType.BRIMSTONE)) {
                    number = getRandomInt(
                      Math.floor(3 + knife.Charge * 3),
                      Math.floor(4 + knife.Charge * 4),
                      TWrng,
                    );
                    offset = getRandomInt(-150, 150, TWrng) / 10;
                    offset2 = getRandomInt(-300, 300, TWrng) / 1000;
                    brimDamage = 1.5;
                  }
                  for (let i = 1; i <= number; i++) {
                    let newKnife = player.FireTear(
                      knife.Position,
                      stand.zeroV,
                      false,
                      true,
                      false,
                    );
                    let newData = newKnife.GetData();
                    newData["Knife"] = true;
                    newKnife.TearFlags = bitFlags(TearFlag.SPECTRAL);
                    newKnife.Scale = 1;
                    newKnife.ResetSpriteScale();
                    newKnife.FallingAcceleration = -0.1;
                    newKnife.FallingSpeed = 0;
                    newKnife.Height = -10;
                    stand.randomV.X = 0;
                    stand.randomV.Y = 1 + offset2;
                    newKnife.Velocity = stand.randomV
                      .Rotated(knife.Rotation - 90 + offset)
                      .mul(15 * player.ShotSpeed);
                    newKnife.CollisionDamage =
                      knife.Charge * player.Damage * (3 - brimDamage);
                    newKnife.GridCollisionClass = EntityGridCollisionClass.NONE;
                    newKnife.EntityCollisionClass = EntityCollisionClass.NONE;
                    newKnife.SpriteRotation =
                      newKnife.Velocity.GetAngleDegrees() + 90;
                    let sprite = newKnife.GetSprite();
                    sprite.ReplaceSpritesheet(0, "gfx/tearKnife.png");
                    sprite.LoadGraphics();
                    knife.Reset();
                    offset = getRandomInt(-150, 150) / 10;
                    offset2 = getRandomInt(-300, 300) / 1000;
                  }
                }

                break;
              }
              // No default
            }
          }
        }
        stand.Freeze = Math.max(0, stand.Freeze - 1);
      } else {
        for (let v of entities) {
          if (v.GetData()["Knife"]) {
            for (let entity of entities) {
              if (
                entity.IsVulnerableEnemy() &&
                !entity.GetData()["Knife"] &&
                entity.Position.Distance(v.Position) < entity.Size + 7
              ) {
                entity.TakeDamage(
                  v.CollisionDamage,
                  DamageFlag.NO_KILL,
                  EntityRef(v),
                  0,
                );
              }
            }
            if (player.Position.Distance(v.Position) > 1000) {
              v.Remove();
            }
          }
        }
      }
    });

    mod.AddCallback(ModCallback.GET_SHADER_PARAMS, (name) => {
      if (name === "ZaWardo") {
        let player = Isaac.GetPlayer(0);
        let maxTime = 165;
        let dist = 1 / (maxTime - 2 - stand.Freeze) + 1 / (stand.Freeze - 2);
        let on = 0;
        if (dist < 0) {
          dist = Math.abs(dist) ** 2;
        } else if (stand.Freeze - 2 === 0 || maxTime - 2 - stand.Freeze === 0) {
          dist = 1;
        } else {
          on = 0.5;
        }
        switch (stand.Freeze) {
          case 277: {
            // sfx.Play(snd.TICK_9, 5, 0, false, 1);

            break;
          }

          case 157: {
            // sfx.Play(snd.TICK_5, 5, 0, false, 1);

            break;
          }

          case 1: {
            // sfx.Play(snd.RESUME_TIME, 2, 0, false, 1);

            break;
          }

          case 0: {
            dist = 0;

            break;
          }
          // No default
        }
        return { DistortionScale: dist, DistortionOn: on };
      }
      return undefined;
    });

    mod.AddCallback(ModCallback.POST_PROJECTILE_UPDATE, (tear) => {
      if (stand.Freeze === 1) {
        let data = tear.GetData();
        data["Frozen"] = false;
        tear.Velocity = data["StoredVel"] as Vector;
        tear.FallingSpeed = data["StoredFall"] as float;
        tear.FallingAccel = data["StoredAcc"] as float;
      } else if (stand.Freeze > 1) {
        let data = tear.GetData();
        if (data["Frozen"]) {
          tear.Velocity = stand.zeroV;
          tear.FallingAccel = -0.1;
          tear.FallingSpeed = 0;
        } else {
          data["Frozen"] = true;
          data["StoredVel"] = tear.Velocity;
          data["StoredFall"] = tear.FallingSpeed;
          data["StoredAcc"] = tear.FallingAccel;
        }
      }
    });

    mod.AddCallback(
      ModCallback.ENTITY_TAKE_DMG,
      (target, damage, flags, source, countdown) => {
        const { player } = this;
        return !(
          player &&
          stand.Freeze > 0 &&
          target.Type !== EntityType.PLAYER &&
          hasFlag(flags, DamageFlag.LASER) &&
          !player.HasCollectible(CollectibleType.LUDOVICO_TECHNIQUE)
        );
      },
    );
  }
}
