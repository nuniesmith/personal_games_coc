// Expanded structured dataset (names only) grouped by environment & category.
// Avoids copying external descriptive text (only factual names & grouping).

// ------------------
// HOME VILLAGE
// ------------------
export const homeVillage = {
  buildings: {
    defensive: [
      'Cannon','ArcherTower','Mortar','AirDefense','WizardTower','AirSweeper','HiddenTesla','BombTower','XBow','InfernoTower','EagleArtillery','Scattershot','BuilderHut','SpellTower','Monolith','MultiArcherTower','RicochetCannon','MultiGearTower','Firespitter','Wall'
    ],
    crafting: ['HookTower','FlameSpinner','CrusherMortar'],
    townHallWeapons: ['GigaTesla','GigaInferno','InfernoArtillery'],
    traps: [ 'Bomb','SpringTrap','AirBomb','GiantBomb','SeekingAirMine','SkeletonTrap','TornadoTrap','GigaBomb' ],
    resource: [ 'TownHall','GoldMine','ElixirCollector','DarkElixirDrill','GoldStorage','ElixirStorage','DarkElixirStorage','ClanCastle' ],
    army: [ 'ArmyCamp','Barracks','DarkBarracks','Laboratory','SpellFactory','HeroHall','HeroBanner','DarkSpellFactory','Blacksmith','Workshop','PetHouse' ],
    other: [ 'BuilderHut','HelperHut','BOBsHut','Decorations','Obstacles','Boat','Airship','Forge','LootCart','TraderShop','StrongmanCaravan','SuperSauna','GoblinWorkersStand' ]
  },
  troops: {
    elixir: [ 'Barbarian','Archer','Giant','Goblin','WallBreaker','Balloon','Wizard','Healer','Dragon','PEKKA','BabyDragon','Miner','ElectroDragon','Yeti','DragonRider','ElectroTitan','RootRider','Thrower' ],
    dark: [ 'Minion','HogRider','Valkyrie','Golem','Witch','LavaHound','Bowler','IceGolem','Headhunter','ApprenticeWarden','Druid','Furnace' ],
    super: [ 'SuperBarbarian','SuperArcher','SuperGiant','SneakyGoblin','SuperWallBreaker','RocketBalloon','SuperWizard','SuperDragon','InfernoDragon','SuperMiner','SuperYeti','SuperMinion','SuperHogRider','SuperValkyrie','SuperWitch','IceHound','SuperBowler' ],
    siegeMachines: [ 'WallWrecker','BattleBlimp','StoneSlammer','SiegeBarracks','LogLauncher','FlameFlinger','BattleDrill','TroopLauncher' ],
    pets: [ 'LASSI','ElectroOwl','MightyYak','Unicorn','Frosty','Diggy','PoisonLizard','Phoenix','SpiritFox','AngryJelly','Sneezy' ],
    heroes: [ 'BarbarianKing','ArcherQueen','GrandWarden','RoyalChampion','MinionPrince' ],
    heroEquipment: {
      BarbarianKing: [ 'BarbarianPuppet','RageVial','EarthquakeBoots','Vampstache','GiantGauntlet','SpikyBall','SnakeBracelet' ],
      ArcherQueen: [ 'ArcherPuppet','InvisibilityVial','GiantArrow','HealerPuppet','FrozenArrow','MagicMirror','ActionFigure' ],
      MinionPrince: [ 'HenchmenPuppet','DarkOrb','MetalPants','NobleIron','DarkCrown' ],
      GrandWarden: [ 'EternalTome','LifeGem','RageGem','HealingTome','Fireball','LavaloonPuppet','HeroicTorch' ],
      RoyalChampion: [ 'RoyalGem','SeekingShield','HogRiderPuppet','HasteVial','RocketSpear','ElectroBoots' ]
    },
    spells: {
      elixir: [ 'LightningSpell','HealingSpell','RageSpell','JumpSpell','FreezeSpell','CloneSpell','InvisibilitySpell','RecallSpell','ReviveSpell' ],
      dark: [ 'PoisonSpell','EarthquakeSpell','HasteSpell','SkeletonSpell','BatSpell','OvergrowthSpell','IceBlockSpell' ]
    }
  }
};

// ------------------
// BUILDER BASE
// ------------------
export const builderBase = {
  buildings: {
    defensive: [ 'Cannon','DoubleCannon','ArcherTower','HiddenTesla','Firecrackers','Crusher','GuardPost','AirBombs','MultiMortar','OTTOSOutpost','Roaster','GiantCannon','MegaTesla','LavaLauncher','XBow','Walls' ],
    traps: [ 'PushTrap','SpringTrap','Mine','MegaMine' ],
    resource: [ 'BuilderHall','GoldMine','ElixirCollector','GoldStorage','ElixirStorage','GemMine','BOBControl' ],
    army: [ 'BuilderBarracks','ArmyCamp','StarLaboratory','BattleMachineAltar','ReinforcementCamp','HealingHut','BattleCopterAltar' ],
    other: [ 'Boat','Decorations','Obstacles','ClockTower','ElixirCart' ]
  },
  troops: [ 'RagedBarbarian','SneakyArcher','BoxerGiant','BetaMinion','Bomber','BabyDragon','CannonCart','NightWitch','DropShip','PowerPEKKA','HogGlider','ElectrofireWizard' ],
  heroes: [ 'BattleMachine','BattleCopter' ]
};

// ------------------
// CLAN CAPITAL
// ------------------
export const clanCapital = {
  buildings: {
    defensive: [ 'Cannon','SpearThrower','AirDefense','CapitalHall','MultiCannon','BombTower','MultiMortar','SuperWizardTower','AirBombs','RapidRockets','Crusher','HiddenMegaTesla','GiantCannon','RocketArtillery','InfernoTower','BlastBow','MiniMinionHive','Reflector','GoblinThrower','SuperGiantPost','RaidCartPost','SuperDragonPost','Wall' ],
    traps: [ 'Mine','MegaMine','LogTrap','ZapTrap','SpearTrap' ],
    army: { camps: [ 'ArmyCamp','SpellStorage' ], barracks: [ 'SuperBarbarianBarracks','SneakyArcherBarracks','SuperGiantBarracks','BattleRamBarracks','MinionBarracks','SuperWizardBarracks','RocketBalloonBarracks','SkeletonBarrelBarracks','FlyingFortressYard','RaidCartBarracks','PowerPEKKABarracks','HogRaiderBarracks','SuperDragonBarracks','MountainGolemQuarry','InfernoDragonBarracks','SuperMinerBarracks','MegaSparkyWorkshop' ], spellFactories: [ 'HealSpellFactory','JumpSpellFactory','LightningSpellFactory','FrostSpellFactory','RageSpellFactory','GraveyardSpellFactory','EndlessHasteSpellFactory' ] },
    other: [ 'CapitalHall','DistrictHall','Airship','Decorations','Houses','Terrain' ]
  },
  troops: [ 'SuperBarbarian','SneakyArchers','SuperGiant','BattleRam','MinionHorde','SuperWizard','RocketBalloons','SkeletonBarrels','FlyingFortress','RaidCart','PowerPEKKA','HogRaiders','SuperDragon','MountainGolem','InfernoDragon','SuperMiner','MegaSparky' ],
  spells: [ 'HealingSpell','JumpSpell','LightningSpell','FrostSpell','RageSpell','GraveyardSpell','EndlessHasteSpell' ]
};

// Strategy guide metadata placeholders (no external text copied)
export const strategyGuidesMeta = [
  { slug: 'upgrade-order-th14', title: 'TH14 Upgrade Order (Community)', source: 'https://example.com/guide/th14-upgrade' },
  { slug: 'queen-charge-lalo-basics', title: 'Queen Charge LaLo Basics', source: 'https://example.com/guide/queen-charge-lalo' }
];

// Flattened convenience exports (legacy compatibility for existing UI expecting arrays)
export const buildings = [ ...homeVillage.buildings.defensive.map(n=>({ name:n, category:'Defense' })), ...homeVillage.buildings.resource.map(n=>({ name:n, category:'Resource' })) ];
export const troops = [ ...homeVillage.troops.elixir, ...homeVillage.troops.dark ];
export const superTroops = [ ...homeVillage.troops.super ];
export const spells = [ ...homeVillage.troops.spells.elixir, ...homeVillage.troops.spells.dark ];
export const heroes = [ ...homeVillage.troops.heroes ];
export const heroPets = [ ...homeVillage.troops.pets ];
export const heroEquipment = [ ...new Set(Object.values(homeVillage.troops.heroEquipment).flat()) ];

function buildAllAssets() {
  const base = {
    version: 2,
    homeVillage,
    builderBase,
    clanCapital,
    strategyGuidesMeta,
    buildings,
    troops,
    superTroops,
    spells,
    heroes,
    heroPets,
    heroEquipment
  };
  let manifest;
  try {
    const fs = require('fs');
    const path = require('path');
    const manifestPath = path.join(process.cwd(), 'downloaded-game-assets', 'manifest.json');
    if (fs.existsSync(manifestPath)) {
      manifest = JSON.parse(fs.readFileSync(manifestPath,'utf8'));
      base.icons = { available: true, generatedAt: manifest.generatedAt, categories: {} };
      for (const [cat, info] of Object.entries(manifest.categories || {})) {
        base.icons.categories[cat] = { count: info.count, files: (info.files||[]).map(f => ({ file: f, url: `/assets/game/${cat}/1x/${f}` })) };
      }
    } else base.icons = { available: false };
  } catch { base.icons = { available: false }; }
  try {
    if (base.icons.available) {
      const fs = require('fs');
      const path = require('path');
      const mappingPath = process.env.ICON_MAPPING_FILE || path.join(process.cwd(), 'data', 'asset-icon-mapping.json');
      if (fs.existsSync(mappingPath)) {
        const raw = JSON.parse(fs.readFileSync(mappingPath,'utf8'));
        const mappings = raw.mappings || {};
        const resolved = {};
        for (const [assetName, ref] of Object.entries(mappings)) {
          if (!ref) continue;
          const { category, index } = ref;
          const catEntry = manifest?.categories?.[category];
          if (!catEntry) continue;
          const fileName = catEntry.files?.[index];
          if (!fileName) continue;
          resolved[assetName] = { url: `/assets/game/${category}/1x/${fileName}`, category, index };
        }
        base.iconMapping = { available: true, updatedAt: raw.updatedAt || null, count: Object.keys(resolved).length, resolved };
      } else base.iconMapping = { available: false };
    } else base.iconMapping = { available: false };
  } catch { base.iconMapping = { available: false }; }
  return base;
}

class AssetFactory {
  constructor() {
    this._cache = null;
    this._cacheAt = 0;
    this.ttlMs = 5 * 60_000;
  }
  load(force=false) {
    if (!force && this._cache && (Date.now() - this._cacheAt) < this.ttlMs) return this._cache;
    this._cache = buildAllAssets();
    this._cacheAt = Date.now();
    return this._cache;
  }
  getAll() { return this.load(); }
}

export const assetFactory = new AssetFactory();
export function allGameAssets() { return assetFactory.getAll(); }
export default allGameAssets;
