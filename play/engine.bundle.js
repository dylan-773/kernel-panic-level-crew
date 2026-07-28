(() => {
  // engine/content/kit.ts
  var PROGRAM_COST = 1;
  var SCAN_RANGE = { 1: 3, 2: 6, 3: 99 };
  var ATTACK_WIDTH = { 1: 1, 2: 2, 3: 3 };
  var DEFEND_WIDTH = { 1: 1, 2: 2, 3: 3 };
  var WARD_RADIUS = { 1: 1, 2: 2, 3: 3 };
  var LOCK_ROUNDS = 2;
  var WARD_ROUNDS = 2;
  var SIPHON_STEAL = { 1: 2, 2: 3, 3: 4 };
  var PAR_RATE = 1.25;
  var PAR_FLAT = 2;
  var PAR_STRAIN_PER = 2;
  var BASE_REACH = 2;
  function cascadeRam(claimed) {
    return Math.min(2, Math.floor(claimed / 4));
  }
  var ATTACK_MODE_LABEL = {
    redirect: "REDIRECT",
    armHalt: "ARM: HALT",
    armSiphon: "ARM: SIPHON"
  };
  var DEFEND_MODE_LABEL = {
    purge: "PURGE",
    lock: "LOCK",
    ward: "WARD"
  };
  var MODE_LABEL = {
    ...ATTACK_MODE_LABEL,
    ...DEFEND_MODE_LABEL
  };
  var GRIDLOCK_CHIP = 6;
  var AUGMENTS = [
    {
      id: "cfgArmHalt",
      name: "HALT DRIVER",
      kind: "config",
      attackMode: "armHalt",
      desc: "ATTACK config: plant halt traps. A sprung trap costs the intrusion its whole next turn."
    },
    {
      id: "cfgArmSiphon",
      name: "SIPHON DRIVER",
      kind: "config",
      attackMode: "armSiphon",
      desc: "ATTACK config: plant siphon traps. A sprung trap drains RAM from its next turn into yours, more at higher ATTACK tiers, and more again when you are the one springing it."
    },
    {
      id: "cfgLock",
      name: "CLAMP DRIVER",
      kind: "config",
      defendMode: "lock",
      desc: `DEFEND config: freeze junctions for ${LOCK_ROUNDS} rounds against rotation and redirects.`
    },
    {
      id: "cfgWard",
      name: "WARD DRIVER",
      kind: "config",
      defendMode: "ward",
      desc: "DEFEND config: ward an area so no new traps can land in it, and REDIRECT cannot touch anything inside it either, for the full duration on both sides."
    },
    {
      id: "longArms",
      name: "LONG ARMS",
      kind: "boost",
      desc: "Rotate open junctions up to 4 steps from your territory instead of 2, and place patch pieces just as far. Bigger setups, bigger cascades."
    },
    {
      id: "siphonPlus",
      name: "DEEP SIPHON",
      kind: "boost",
      requires: { kind: "augment", id: "cfgArmSiphon" },
      desc: "Your siphon traps steal 1 extra RAM."
    },
    {
      id: "tripwire",
      name: "TRIPWIRE",
      kind: "boost",
      requires: { kind: "augment", id: "cfgArmHalt" },
      desc: "Your halt traps also burn 3 RAM off the victim's next active turn."
    },
    {
      id: "cheapShot",
      name: "CHEAP SHOT",
      kind: "boost",
      desc: "Your first ATTACK each dive costs 0 RAM."
    },
    {
      id: "hotBoot",
      name: "HOT BOOT",
      kind: "boost",
      desc: "Start every dive with +1 RAM on your first turn."
    },
    {
      id: "tapLine",
      name: "TAP LINE",
      kind: "boost",
      desc: "SCAN also traces the intrusion's planned route to the core, visible for 2 rounds."
    },
    {
      id: "echoTap",
      name: "ECHO TAP",
      kind: "boost",
      desc: "Whenever one of your traps fires, gain 2 RAM on your next turn."
    },
    {
      id: "jamAnchor",
      name: "JAM ANCHOR",
      kind: "boost",
      desc: "Your REDIRECT also freezes the junction it twists through the reply and into your next turn. Nothing rotates or redirects it back while it holds."
    },
    {
      id: "sweepCredit",
      name: "SWEEP CREDIT",
      kind: "boost",
      desc: "PURGE refunds 1 RAM per trap it defuses, up to 3 per cast."
    },
    {
      id: "cleanRun",
      name: "CLEAN RUN",
      kind: "boost",
      desc: "Win a dive with zero strain billed and bank one random patch piece. A trap-free win that only misses at the round cap pays 15 credits instead."
    },
    {
      id: "patchRefund",
      name: "SPLICE REFUND",
      kind: "boost",
      requires: { kind: "pouch" },
      desc: "Placing a patch piece refunds its full RAM cost the instant it lands. The pouch still spends the piece itself."
    },
    {
      id: "firstFault",
      name: "FIRST FAULT",
      kind: "boost",
      desc: "The first trap that fires on you each dive bills zero Neural Strain. Every trap after that costs full."
    },
    {
      id: "overtimeClause",
      name: "OVERTIME CLAUSE",
      kind: "boost",
      desc: "Cap wins pay 75 percent of the ticket instead of 50. The client eats every hour past the deadline, not half."
    },
    {
      id: "darkDiscount",
      name: "DARKNET RATE",
      kind: "boost",
      desc: "Dark web patch piece pulls cost 15 percent less. The vendor still only takes credits and the roll stays blind."
    }
  ];
  var AUGMENT_BY_ID = Object.fromEntries(AUGMENTS.map((a) => [a.id, a]));

  // engine/duel-types.ts
  function otherSide(s) {
    return s === "player" ? "opp" : "player";
  }
  var PIECE_I = 5;
  var PIECE_L = 3;
  var PIECE_T = 7;
  var PIECE_X = 15;
  var BASE_KIT = {
    scanTier: 1,
    attackTier: 1,
    defendTier: 1,
    attackMode: "redirect",
    defendMode: "purge",
    augments: [],
    patchPouch: []
  };
  var ROUND_CAP = 25;

  // engine/types.ts
  var DX = [0, 1, 0, -1];
  var DY = [-1, 0, 1, 0];
  function oppositeDir(d) {
    return (d + 2) % 4;
  }
  function rotateArms(mask, rot) {
    const r = (rot % 4 + 4) % 4;
    return (mask << r | mask >> 4 - r) & 15;
  }
  function cellIndex(w, x, y) {
    return y * w + x;
  }

  // engine/duel-power.ts
  function effectiveDuelArms(c) {
    return rotateArms(c.base, c.rot);
  }
  function entryOf(side) {
    return side === "player" ? "entryP" : "entryO";
  }
  function passable(c, side) {
    if (c.kind === "block")
      return false;
    if (c.kind === "core")
      return true;
    if (c.kind === "entryP")
      return side === "player";
    if (c.kind === "entryO")
      return side === "opp";
    return c.owner === "none" || c.owner === side;
  }
  function runFlood(s, side) {
    const start = side === "player" ? s.entryP : s.entryO;
    const enemy = otherSide(side);
    const reached = new Array(s.cells.length).fill(false);
    const claimed = [];
    const trapsFired = [];
    let reachedCore = false;
    reached[start] = true;
    const queue = [start];
    while (queue.length > 0) {
      const i = queue.shift();
      const c = s.cells[i];
      const arms = effectiveDuelArms(c);
      for (let d = 0;d < 4; d++) {
        if ((arms & 1 << d) === 0)
          continue;
        const nx = c.x + DX[d];
        const ny = c.y + DY[d];
        if (nx < 0 || ny < 0 || nx >= s.w || ny >= s.h)
          continue;
        const ni = cellIndex(s.w, nx, ny);
        if (reached[ni])
          continue;
        const nc = s.cells[ni];
        if (!passable(nc, side))
          continue;
        if ((effectiveDuelArms(nc) & 1 << oppositeDir(d)) === 0)
          continue;
        reached[ni] = true;
        if (nc.kind === "core") {
          reachedCore = true;
          continue;
        }
        if (nc.kind === "node" && nc.owner === "none") {
          nc.owner = side;
          nc.claimSeq = ++s.claimCounter;
          nc.claimWave = claimed.length;
          claimed.push(ni);
          if (nc.trap && nc.trap.by === enemy) {
            const trap = nc.trap;
            nc.trap = null;
            trapsFired.push({ idx: ni, kind: trap.kind, drain: trap.drain });
          }
        }
        queue.push(ni);
      }
    }
    return { reached, claimed, trapsFired, reachedCore };
  }
  function computeDuelPower(s) {
    const read = (side) => {
      const start = side === "player" ? s.entryP : s.entryO;
      const out = new Array(s.cells.length).fill(false);
      out[start] = true;
      const queue = [start];
      while (queue.length > 0) {
        const i = queue.shift();
        const c = s.cells[i];
        const arms = effectiveDuelArms(c);
        for (let d = 0;d < 4; d++) {
          if ((arms & 1 << d) === 0)
            continue;
          const nx = c.x + DX[d];
          const ny = c.y + DY[d];
          if (nx < 0 || ny < 0 || nx >= s.w || ny >= s.h)
            continue;
          const ni = cellIndex(s.w, nx, ny);
          if (out[ni])
            continue;
          const nc = s.cells[ni];
          if (nc.kind === "block")
            continue;
          if (nc.kind === "entryP" && side !== "player")
            continue;
          if (nc.kind === "entryO" && side !== "opp")
            continue;
          if (nc.kind === "node" && nc.owner !== side)
            continue;
          if ((effectiveDuelArms(nc) & 1 << oppositeDir(d)) === 0)
            continue;
          out[ni] = true;
          if (nc.kind !== "core")
            queue.push(ni);
        }
      }
      return out;
    };
    return { player: read("player"), opp: read("opp") };
  }
  function rotCostFor(c, needed) {
    if (c.fused) {
      return (rotateArms(c.base, c.rot) & needed) === needed ? 0 : Infinity;
    }
    for (let k = 0;k < 4; k++) {
      if ((rotateArms(c.base, (c.rot + k) % 4) & needed) === needed)
        return k;
    }
    return Infinity;
  }
  function routePlan(s, side, avoid, depth = 0) {
    const n = s.cells.length;
    const start = side === "player" ? s.entryP : s.entryO;
    const dist = new Array(n * 4).fill(Infinity);
    const prev = new Array(n * 4).fill(-1);
    const buckets = [[]];
    const push = (state, d) => {
      while (buckets.length <= d)
        buckets.push([]);
      buckets[d].push(state);
    };
    const startCell = s.cells[start];
    const startArms = effectiveDuelArms(startCell);
    for (let d = 0;d < 4; d++) {
      if ((startArms & 1 << d) === 0)
        continue;
      const nx = startCell.x + DX[d];
      const ny = startCell.y + DY[d];
      if (nx < 0 || ny < 0 || nx >= s.w || ny >= s.h)
        continue;
      const ni = cellIndex(s.w, nx, ny);
      const nc = s.cells[ni];
      if (!passable(nc, side) || avoid && avoid.has(ni))
        continue;
      if (nc.kind === "core")
        return { cost: 0, path: [], steps: [] };
      if (nc.kind !== "node")
        continue;
      const st = ni * 4 + d;
      if (dist[st] > 0) {
        dist[st] = 0;
        push(st, 0);
      }
    }
    let bestGoal = Infinity;
    let bestGoalState = -1;
    for (let d = 0;d < buckets.length; d++) {
      if (d >= bestGoal)
        break;
      const bucket = buckets[d];
      if (!bucket)
        continue;
      while (bucket.length > 0) {
        const st = bucket.pop();
        if (dist[st] < d)
          continue;
        const i = st >> 2;
        const dIn = st & 3;
        const c = s.cells[i];
        for (let dOut = 0;dOut < 4; dOut++) {
          if (dOut === oppositeDir(dIn))
            continue;
          const nx = c.x + DX[dOut];
          const ny = c.y + DY[dOut];
          if (nx < 0 || ny < 0 || nx >= s.w || ny >= s.h)
            continue;
          const ni = cellIndex(s.w, nx, ny);
          const nc = s.cells[ni];
          if (!passable(nc, side) || avoid && avoid.has(ni))
            continue;
          const needed = 1 << oppositeDir(dIn) | 1 << dOut;
          let k = rotCostFor(c, needed);
          if (!isFinite(k))
            continue;
          if (k > 0 && c.owner === side)
            k += 1;
          const nd = d + k;
          if (nc.kind === "core") {
            if (nd < bestGoal) {
              bestGoal = nd;
              bestGoalState = st;
            }
            continue;
          }
          if (nc.kind !== "node")
            continue;
          const nst = ni * 4 + dOut;
          if (nd < dist[nst]) {
            dist[nst] = nd;
            prev[nst] = st;
            push(nst, nd);
          }
        }
      }
    }
    if (bestGoalState === -1)
      return null;
    const chain = [];
    let cur = bestGoalState;
    while (cur !== -1) {
      chain.push(cur);
      cur = prev[cur];
    }
    chain.reverse();
    const path = [];
    let total = 0;
    const seenRot = new Map;
    let conflict = -1;
    for (let ci = 0;ci < chain.length; ci++) {
      const st = chain[ci];
      const i = st >> 2;
      const dIn = st & 3;
      const c = s.cells[i];
      const nextIdx = ci + 1 < chain.length ? chain[ci + 1] >> 2 : s.coreIdx;
      const dOut = dirBetween(c, s.cells[nextIdx]);
      const needed = 1 << oppositeDir(dIn) | 1 << dOut;
      const k = rotCostFor(c, needed);
      if (!isFinite(k))
        return null;
      const targetRot = (c.rot + k) % 4;
      const prior = seenRot.get(i);
      if (prior !== undefined) {
        if (prior !== targetRot)
          conflict = i;
        continue;
      }
      seenRot.set(i, targetRot);
      total += k;
      path.push({ idx: i, targetRot, turns: k });
    }
    if (conflict !== -1) {
      if (depth < 4) {
        const nextAvoid = new Set(avoid ?? []);
        nextAvoid.add(conflict);
        return routePlan(s, side, nextAvoid, depth + 1);
      }
      return { cost: total, path, steps: path.filter((p) => p.turns > 0), approx: true };
    }
    return { cost: total, path, steps: path.filter((p) => p.turns > 0) };
  }
  function dirBetween(a, b) {
    if (b.x - a.x === 1)
      return 1;
    if (b.x - a.x === -1)
      return 3;
    if (b.y - a.y === 1)
      return 2;
    return 0;
  }
  function routeCost(s, side, avoid) {
    const plan = routePlan(s, side, avoid);
    return plan ? plan.cost : Infinity;
  }
  function isFrontier(s, side, idx) {
    const c = s.cells[idx];
    if (c.kind !== "node" || c.owner !== "none")
      return false;
    for (let d = 0;d < 4; d++) {
      const nx = c.x + DX[d];
      const ny = c.y + DY[d];
      if (nx < 0 || ny < 0 || nx >= s.w || ny >= s.h)
        continue;
      const nc = s.cells[cellIndex(s.w, nx, ny)];
      if (nc.kind === entryOf(side))
        return true;
      if (nc.kind === "node" && nc.owner === side)
        return true;
    }
    return false;
  }
  function reachOf(s, side) {
    if (side === "player" && s.kit.augments.includes("longArms"))
      return BASE_REACH + 2;
    return BASE_REACH;
  }
  function inReach(s, side, idx, reach) {
    const c0 = s.cells[idx];
    if (c0.kind !== "node" || c0.owner !== "none")
      return false;
    return withinReachWalk(s, side, idx, reach);
  }
  function canPlace(s, side, idx) {
    const c0 = s.cells[idx];
    if (!c0 || c0.kind !== "block")
      return false;
    return withinReachWalk(s, side, idx, reachOf(s, side));
  }
  function withinReachWalk(s, side, idx, reach) {
    const seen = new Set([idx]);
    let frontier = [idx];
    for (let step = 1;step <= reach; step++) {
      const next = [];
      for (const i of frontier) {
        const c = s.cells[i];
        for (let d = 0;d < 4; d++) {
          const nx = c.x + DX[d];
          const ny = c.y + DY[d];
          if (nx < 0 || ny < 0 || nx >= s.w || ny >= s.h)
            continue;
          const ni = cellIndex(s.w, nx, ny);
          if (seen.has(ni))
            continue;
          const nc = s.cells[ni];
          if (nc.kind === entryOf(side))
            return true;
          if (nc.kind === "node" && nc.owner === side)
            return true;
          if (nc.kind === "node" && nc.owner === "none" && step < reach) {
            seen.add(ni);
            next.push(ni);
          }
        }
      }
      frontier = next;
      if (frontier.length === 0)
        break;
    }
    return false;
  }
  function canRotate(s, side, idx) {
    const c = s.cells[idx];
    if (!c || c.kind !== "node")
      return false;
    if (c.fused)
      return false;
    const enemy = otherSide(side);
    if (c.lockedThroughRound >= s.round && c.lockedBy === enemy)
      return false;
    if (c.owner === side)
      return true;
    if (c.owner !== "none")
      return false;
    return inReach(s, side, idx, reachOf(s, side));
  }

  // engine/patch-cells.ts
  var PLACE_COST = 2;
  function armCount(mask) {
    let n = 0;
    for (let d = 0;d < 4; d++)
      if (mask & 1 << d)
        n++;
    return n;
  }

  // engine/rng.ts
  function seedRng(seed) {
    return seed >>> 0;
  }
  function nextU32(state) {
    let a = state + 1831565813 >>> 0;
    let t = a;
    t = Math.imul(t ^ t >>> 15, t | 1);
    t ^= t + Math.imul(t ^ t >>> 7, t | 61);
    return [((t ^ t >>> 14) >>> 0) / 4294967296, a];
  }

  class Rng {
    state;
    constructor(seed) {
      this.state = seedRng(seed);
    }
    next() {
      const [v, s] = nextU32(this.state);
      this.state = s;
      return v;
    }
    int(n) {
      return Math.floor(this.next() * n);
    }
    pick(arr) {
      return arr[this.int(arr.length)];
    }
    shuffle(arr) {
      for (let i = arr.length - 1;i > 0; i--) {
        const j = this.int(i + 1);
        [arr[i], arr[j]] = [arr[j], arr[i]];
      }
      return arr;
    }
  }

  // engine/duel-actions.ts
  function emit(s, kind, n) {
    s.fx.push({ id: s.fxNext++, kind, n });
  }
  function say(s, text) {
    s.notice = { id: s.fxNext++, text };
  }
  function roll(s) {
    const [v, next] = nextU32(s.rngState);
    s.rngState = next;
    return v;
  }
  function kitHas(s, aug) {
    return s.kit.augments.includes(aug);
  }
  function tierOf(s, side, prog) {
    if (side === "opp")
      return s.cfg.oppTier;
    if (prog === "scan")
      return s.kit.scanTier;
    if (prog === "attack")
      return s.kit.attackTier;
    return s.kit.defendTier;
  }
  function tutorialLessonDone(s) {
    return s.tutFlags.scanned && s.tutFlags.purged && s.tutFlags.attacked;
  }
  function programUnlocked(s, prog) {
    if (!s.cfg.tutorial)
      return true;
    if (prog === "scan") {
      return s.tutFlags.scanned || s.cells.some((c) => c.trap && c.trap.by === "opp");
    }
    if (prog === "defend")
      return s.tutFlags.scanned;
    return s.tutFlags.purged;
  }
  function attackCost(s, side) {
    if (side === "player" && s.econ.player.attacksCast === 0 && kitHas(s, "cheapShot"))
      return 0;
    return PROGRAM_COST;
  }
  function programCost(s, side, prog) {
    return prog === "attack" ? attackCost(s, side) : PROGRAM_COST;
  }
  function finishDuel(s, winner, kind, reason) {
    s.phase = winner === "player" ? "won" : "lost";
    s.winKind = kind;
    if (reason)
      s.endReason = reason;
    s.notice = null;
    if (winner === "player") {
      const over = Math.max(0, s.econ.player.rotations - s.par);
      let chip = PAR_STRAIN_PER * over;
      chip += 4 * Math.max(0, s.econ.player.trapsFired - (kitHas(s, "firstFault") ? 1 : 0));
      if (kind === "cap")
        chip += 10;
      if (kind === "gridlock")
        chip += GRIDLOCK_CHIP;
      s.strainChip = Math.min(40, chip);
    } else {
      s.strainChip = 0;
    }
    emit(s, winner === "player" ? "win" : "lose", s.strainChip);
  }
  function settleFloods(s, acting) {
    let actingTrapped = false;
    for (const side of [acting, otherSide(acting)]) {
      if (s.phase !== "playing")
        break;
      const f = runFlood(s, side);
      const mine = side === "player";
      if (f.claimed.length >= 3) {
        emit(s, mine ? "cascade" : "cascadeOpp", f.claimed.length);
      } else if (f.claimed.length > 0) {
        emit(s, mine ? "claim" : "claimOpp", f.claimed.length);
      }
      let bonus = cascadeRam(f.claimed.length);
      if (bonus > 0) {
        s.econ[side].drainNext -= bonus;
        emit(s, side === "player" ? "cascadeRam" : "cascadeRamOpp", bonus);
      }
      for (const trap of f.trapsFired) {
        const econ = s.econ[side];
        const enemyEcon = s.econ[otherSide(side)];
        econ.trapsFired++;
        if (trap.kind === "halt") {
          econ.drainNext += trap.drain;
          if (side === acting) {
            actingTrapped = true;
          } else {
            econ.loseNextTurn = true;
          }
          emit(s, "trapFire", 1);
          say(s, side === "player" ? "HALT TRAP. Your signal hit an armed node. The cascade lands, then your turn is forfeit." : "Your halt trap fired. The intrusion stalls a full cycle.");
        } else {
          econ.drainNext += trap.drain;
          enemyEcon.drainNext -= trap.drain;
          emit(s, "siphonFire", trap.drain);
          say(s, side === "player" ? `SIPHON TRAP. It bleeds ${trap.drain} RAM out of your next turn.` : `Your siphon fired. ${trap.drain} RAM drains out of its next turn, into yours.`);
        }
        if (otherSide(side) === "player" && kitHas(s, "echoTap")) {
          s.econ.player.drainNext -= 2;
        }
      }
      if (f.reachedCore) {
        if (s.cfg.tutorial && side === "player") {
          finishDuel(s, "opp", "core", "Your flood touched the core, and every port on the machine slammed shut at once.");
        } else {
          finishDuel(s, side, "core", side === "player" ? "Your flood touched the core first. The intrusion collapses." : "Its flood reached the core before yours did.");
        }
      }
    }
    s.power = computeDuelPower(s);
    return actingTrapped;
  }
  function applyRotate(s, side, idx) {
    const econ = s.econ[side];
    if (econ.ram < 1)
      return false;
    const c = s.cells[idx];
    c.rot = (c.rot + 1) % 4;
    c.spin += 1;
    econ.ram -= 1;
    econ.rotations += 1;
    emit(s, "rotate");
    const trapped = settleFloods(s, side);
    if (trapped && s.phase === "playing") {
      if (side === "player")
        forceEndPlayerTurn(s);
      else
        endOppTurn(s);
    }
    return true;
  }
  function applyPlace(s, side, idx, pouchIdx) {
    const econ = s.econ[side];
    if (econ.ram < PLACE_COST || econ.placedThisTurn)
      return false;
    const mask = s.patchPouch[pouchIdx];
    if (mask === undefined)
      return false;
    const c = s.cells[idx];
    c.kind = "node";
    c.base = mask;
    c.rot = 0;
    c.fused = true;
    econ.ram -= PLACE_COST;
    if (side === "player" && kitHas(s, "patchRefund"))
      econ.ram += PLACE_COST;
    econ.placedThisTurn = true;
    s.patchPouch = s.patchPouch.filter((_, i) => i !== pouchIdx);
    emit(s, "place");
    say(s, "PATCH PIECE. The slag melts into a live junction, arms exactly as held.");
    const trapped = settleFloods(s, side);
    if (trapped && s.phase === "playing") {
      if (side === "player")
        forceEndPlayerTurn(s);
      else
        endOppTurn(s);
    }
    return true;
  }
  function armTargetLegal(s, caster, idx) {
    const c = s.cells[idx];
    if (!c || c.kind !== "node" || c.owner !== "none")
      return false;
    if (c.trap)
      return false;
    if (c.wardThroughRound >= s.round && c.wardBy === otherSide(caster))
      return false;
    return true;
  }
  function redirectTargetLegal(s, caster, idx) {
    const c = s.cells[idx];
    if (!c || c.kind !== "node")
      return false;
    if (c.fused)
      return false;
    if (c.owner === caster)
      return false;
    if (c.lockedThroughRound >= s.round && c.lockedBy === otherSide(caster))
      return false;
    if (c.wardThroughRound >= s.round && c.wardBy === otherSide(caster))
      return false;
    return true;
  }
  function purgeTargetLegal(s, caster, idx) {
    const c = s.cells[idx];
    if (!c || c.kind !== "node" || !c.trap)
      return false;
    if (c.trap.by !== otherSide(caster))
      return false;
    if (caster === "player" && !c.trap.revealed)
      return false;
    return true;
  }
  function lockTargetLegal(s, caster, idx) {
    const c = s.cells[idx];
    if (!c || c.kind !== "node")
      return false;
    if (c.owner === otherSide(caster))
      return false;
    if (c.lockedThroughRound >= s.round)
      return false;
    return true;
  }
  function wardTargetLegal(s, caster, idx) {
    const c = s.cells[idx];
    if (!c || c.kind !== "node")
      return false;
    if (c.owner === otherSide(caster))
      return false;
    return true;
  }
  function attackTargetLegal(s, caster, mode, idx) {
    return mode === "redirect" ? redirectTargetLegal(s, caster, idx) : armTargetLegal(s, caster, idx);
  }
  function defendTargetLegal(s, caster, mode, idx) {
    if (mode === "purge")
      return purgeTargetLegal(s, caster, idx);
    if (mode === "lock")
      return lockTargetLegal(s, caster, idx);
    return wardTargetLegal(s, caster, idx);
  }
  function entryKindOf(side) {
    return side === "player" ? "entryP" : "entryO";
  }
  function applyCast(s, side, prog, mode, targets) {
    const econ = s.econ[side];
    econ.ram -= programCost(s, side, prog);
    econ.used[prog] = true;
    if (prog === "attack")
      econ.attacksCast++;
    if (prog === "scan")
      econ.scansCast++;
    if (prog === "defend")
      econ.defendsCast++;
    if (s.cfg.tutorial && side === "player") {
      if (prog === "scan")
        s.tutFlags.scanned = true;
      if (prog === "defend")
        s.tutFlags.purged = true;
      if (prog === "attack")
        s.tutFlags.attacked = true;
      if (s.tutorialLessonRound === 0 && tutorialLessonDone(s)) {
        s.tutorialLessonRound = s.round;
      }
    }
    const enemy = otherSide(side);
    if (prog === "scan") {
      const range = SCAN_RANGE[tierOf(s, side, "scan")];
      const owned = s.cells.filter((c) => c.kind === "node" && c.owner === side || c.kind === entryKindOf(side));
      let found = 0;
      for (const c of s.cells) {
        if (!c.trap || c.trap.by !== enemy || c.trap.revealed)
          continue;
        if (owned.some((o) => Math.abs(o.x - c.x) + Math.abs(o.y - c.y) <= range)) {
          c.trap.revealed = true;
          found++;
        }
      }
      if (side === "player" && kitHas(s, "tapLine")) {
        const plan = routePlan(s, "opp");
        if (plan) {
          s.routeTrace = { round: s.round + 1, cells: plan.path.map((p) => p.idx) };
          emit(s, "trace");
        }
      }
      emit(s, "scan");
      if (side === "player") {
        say(s, found > 0 ? `SCAN: ${found} armed node${found === 1 ? "" : "s"} exposed, permanently.` : "SCAN: nothing armed in range.");
      }
      return;
    }
    if (prog === "attack") {
      if (mode === "redirect") {
        for (const idx of targets) {
          const c = s.cells[idx];
          c.rot = (c.rot + 1) % 4;
          c.spin += 1;
          if (side === "player" && kitHas(s, "jamAnchor")) {
            c.lockedThroughRound = Math.max(c.lockedThroughRound, s.round + 1);
            c.lockedBy = "player";
          }
        }
        if (side === "player")
          s.lastPlayerHitRound = s.round;
        emit(s, "redirect", targets.length);
        say(s, side === "player" ? "REDIRECT. Their line twists off true." : "It twisted one of your junctions off true. Power is down past the break.");
        settleFloods(s, side);
      } else {
        const kind = mode === "armSiphon" ? "siphon" : "halt";
        let drain = 0;
        if (kind === "siphon") {
          drain = SIPHON_STEAL[tierOf(s, side, "attack")] + (side === "player" ? 1 : 0) + (side === "player" && kitHas(s, "siphonPlus") ? 1 : 0);
        } else if (side === "player" && kitHas(s, "tripwire")) {
          drain = 3;
        }
        for (const idx of targets) {
          s.cells[idx].trap = { by: side, revealed: side === "player", kind, drain };
        }
        if (side === "player")
          s.lastPlayerHitRound = s.round;
        emit(s, "trapSet");
        say(s, side === "player" ? kind === "siphon" ? "Siphon armed. Let it walk into your meter." : "Halt trap armed. Let it walk into it." : "It planted a trap on an open junction nearby. Tread carefully.");
      }
      return;
    }
    if (mode === "purge") {
      let n = 0;
      for (const idx of targets) {
        if (s.cells[idx].trap) {
          s.cells[idx].trap = null;
          n++;
        }
      }
      if (n > 0 && side === "player" && kitHas(s, "sweepCredit")) {
        econ.ram += Math.min(n, 3) * PROGRAM_COST;
      }
      emit(s, "purge", n);
      say(s, side === "player" ? `PURGE. ${n} trap${n === 1 ? "" : "s"} defused.` : "It swept your traps off its lane.");
    } else if (mode === "lock") {
      const through = side === "player" ? s.round + LOCK_ROUNDS - 1 : s.round + LOCK_ROUNDS;
      for (const idx of targets) {
        const c = s.cells[idx];
        c.lockedThroughRound = Math.max(c.lockedThroughRound, through);
        c.lockedBy = side;
      }
      if (side === "player" && targets.some((i) => s.cells[i].owner === "none")) {
        s.lastPlayerHitRound = s.round;
      }
      emit(s, "lock");
      say(s, side === "player" ? "LOCK. That junction is frozen solid." : "It clamped a junction solid. You cannot turn that one for now.");
    } else if (mode === "ward") {
      const radius = WARD_RADIUS[tierOf(s, side, "defend")];
      const through = s.round + WARD_ROUNDS;
      const center = s.cells[targets[0]];
      for (const c of s.cells) {
        if (c.kind !== "node" || c.owner === enemy)
          continue;
        if (Math.abs(c.x - center.x) + Math.abs(c.y - center.y) > radius)
          continue;
        c.wardThroughRound = Math.max(c.wardThroughRound, through);
        c.wardBy = side;
      }
      emit(s, "ward");
      say(s, side === "player" ? "WARD up. Nothing gets planted in that patch." : "It warded a whole approach. Your traps will not land there.");
    }
  }
  function beginTurnEconomy(s, side) {
    const econ = s.econ[side];
    econ.used = { scan: false, attack: false, defend: false };
    econ.placedThisTurn = false;
    if (econ.loseNextTurn) {
      econ.loseNextTurn = false;
      econ.ram = 0;
      econ.carry = 0;
      emit(s, "turnLost");
      say(s, side === "player" ? "Your turn burns away in the trap's wake." : "The intrusion stalls a full cycle.");
      return false;
    }
    const ram = econ.ramPerTurn + econ.carry - econ.drainNext;
    econ.drainNext = 0;
    econ.ram = Math.max(0, ram);
    econ.carry = 0;
    return true;
  }
  function startOppTurn(s) {
    s.turn = "opp";
    s.oppTurn = { started: false, pendingCast: null, queue: [], replans: 3, lastReplanCost: Infinity, ramAtStart: 0, aim: null };
    const acts = beginTurnEconomy(s, "opp");
    s.oppTurn.ramAtStart = s.econ.opp.ram;
    if (!acts) {
      endOppTurn(s);
    }
  }
  function endOppTurn(s) {
    if (s.phase !== "playing")
      return;
    const econ = s.econ.opp;
    econ.carry = Math.min(econ.carryCap, Math.max(0, econ.ram));
    s.round++;
    if (s.routeTrace && s.routeTrace.round < s.round)
      s.routeTrace = null;
    if (s.cfg.tutorial) {
      const lessonOver = tutorialLessonDone(s) && s.round > s.tutorialLessonRound + 1;
      if (lessonOver || s.round >= 7) {
        finishDuel(s, "opp", "core", "The machine stopped pretending and sealed itself. The door was never really open.");
        return;
      }
    }
    if (s.round > ROUND_CAP) {
      const pd = routeCost(s, "player");
      const od = routeCost(s, "opp");
      const playerCloser = pd <= od;
      finishDuel(s, playerCloser ? "player" : "opp", "cap", playerCloser ? "The link timed out with your route closer to the core than its. It counts, barely." : "The link timed out with its route closer to the core than yours.");
      return;
    }
    if (!playerHasRoute(s)) {
      s.severedStreak++;
      if (s.severedStreak >= 2) {
        if (isFinite(routeCost(s, "opp"))) {
          finishDuel(s, "opp", "severed", "SEVERED. Its territory walls your port off from the core. No rotation and no patch piece opens a route, so the link is already lost.");
        } else {
          finishDuel(s, "player", "gridlock", "Total gridlock. Neither signal can reach the core. The link collapses in your favor, and the dead link bites on the way out.");
        }
        return;
      }
      say(s, "ROUTE LOST. No path from your port to the core. Open one this turn or the link is called.");
    } else {
      s.severedStreak = 0;
    }
    s.turn = "player";
    const acts = beginTurnEconomy(s, "player");
    if (!acts) {
      startOppTurn(s);
    }
  }
  function endPlayerTurn(s) {
    if (s.phase !== "playing")
      return;
    const econ = s.econ.player;
    econ.carry = Math.min(econ.carryCap, Math.max(0, econ.ram));
    emit(s, "endTurn");
    startOppTurn(s);
  }
  var RESCUE_DEPTH = 2;
  function rescueMasks(pouch) {
    if (pouch.some((m) => armCount(m) >= 4))
      return [PIECE_X];
    return [...new Set(pouch)];
  }
  function withoutOne(pouch, mask) {
    const idx = pouch.indexOf(mask);
    return pouch.filter((_, i) => i !== idx);
  }
  function playerHasRoute(s) {
    if (isFinite(routeCost(s, "player")))
      return true;
    return rescueWithPieces(s, s.patchPouch, Math.min(s.patchPouch.length, RESCUE_DEPTH));
  }
  function rescueWithPieces(s, pouch, cellsLeft) {
    if (cellsLeft <= 0 || pouch.length === 0)
      return false;
    const masks = rescueMasks(pouch);
    for (let i = 0;i < s.cells.length; i++) {
      if (!canPlace(s, "player", i))
        continue;
      const c = s.cells[i];
      const prev = { kind: c.kind, base: c.base, rot: c.rot, fused: c.fused };
      for (const mask of masks) {
        c.kind = "node";
        c.base = mask;
        c.rot = 0;
        c.fused = true;
        const ok = isFinite(routeCost(s, "player")) || rescueWithPieces(s, withoutOne(pouch, mask), cellsLeft - 1);
        c.kind = prev.kind;
        c.base = prev.base;
        c.rot = prev.rot;
        c.fused = prev.fused;
        if (ok)
          return true;
      }
    }
    return false;
  }
  function forceEndPlayerTurn(s) {
    if (s.phase !== "playing")
      return;
    s.econ.player.ram = 0;
    s.econ.player.carry = 0;
    startOppTurn(s);
  }

  // engine/duel-setup.ts
  var MAX_OPENING_CLAIM = 3;
  function drawMask(rng) {
    const v = rng.next();
    if (v < 0.4)
      return PIECE_I;
    if (v < 0.85)
      return PIECE_L;
    if (v < 0.97)
      return PIECE_T;
    return PIECE_X;
  }
  function initialEcon(ramPerTurn, carryCap) {
    return {
      ramPerTurn,
      ram: 0,
      carry: 0,
      carryCap,
      drainNext: 0,
      loseNextTurn: false,
      used: { scan: false, attack: false, defend: false },
      attacksCast: 0,
      scansCast: 0,
      defendsCast: 0,
      trapsFired: 0,
      rotations: 0,
      placedThisTurn: false
    };
  }
  function buildCells(cfg, rng) {
    const { w, h } = cfg;
    const midY = Math.floor(h / 2);
    const entryP = cellIndex(w, 0, midY);
    const entryO = cellIndex(w, w - 1, midY);
    const coreIdx = cellIndex(w, Math.floor(w / 2), midY);
    const near = (i, j) => {
      const ax = i % w;
      const ay = Math.floor(i / w);
      const bx = j % w;
      const by = Math.floor(j / w);
      return Math.abs(ax - bx) + Math.abs(ay - by);
    };
    const cells = [];
    for (let y = 0;y < h; y++) {
      for (let x = 0;x < w; x++) {
        const i = cellIndex(w, x, y);
        const protectedCell = i === entryP || i === entryO || i === coreIdx || near(i, entryP) < 2 || near(i, entryO) < 2 || near(i, coreIdx) < 2;
        const slag = !protectedCell && rng.next() < (cfg.slag ?? (cfg.tutorial ? 0.12 : 0.18));
        cells.push({
          x,
          y,
          kind: slag ? "block" : "node",
          base: slag ? 0 : drawMask(rng),
          rot: slag ? 0 : rng.int(4),
          fused: false,
          spin: 0,
          owner: "none",
          claimSeq: 0,
          claimWave: 0,
          trap: null,
          lockedThroughRound: 0,
          lockedBy: null,
          wardThroughRound: 0,
          wardBy: null
        });
      }
    }
    cells[entryP].kind = "entryP";
    cells[entryP].base = 7;
    cells[entryP].rot = 0;
    cells[entryP].owner = "player";
    cells[entryO].kind = "entryO";
    cells[entryO].base = 13;
    cells[entryO].rot = 0;
    cells[entryO].owner = "opp";
    cells[coreIdx].kind = "core";
    cells[coreIdx].base = 15;
    cells[coreIdx].rot = 0;
    cells[coreIdx].owner = "none";
    for (const c of cells)
      c.spin = c.rot;
    return { cells, entryP, entryO, coreIdx };
  }
  function createDuel(cfg, seed, kit, playerRamPerTurn, retry = 0) {
    const rng = new Rng(seed ^ 625341585);
    const carryCap = 2;
    let best = null;
    let bestScore = Infinity;
    let loose = null;
    let looseScore = Infinity;
    let lastResort = null;
    let lastResortScore = Infinity;
    let anyFair = null;
    let anyFairScore = Infinity;
    for (let attempt = 0;attempt < 160; attempt++) {
      const { cells, entryP, entryO, coreIdx } = buildCells(cfg, rng);
      const s2 = {
        cfg,
        seed,
        w: cfg.w,
        h: cfg.h,
        cells,
        entryP,
        entryO,
        coreIdx,
        power: { player: [], opp: [] },
        phase: "playing",
        winKind: null,
        endReason: null,
        round: 1,
        turn: "player",
        econ: { player: initialEcon(playerRamPerTurn, carryCap), opp: initialEcon(cfg.oppRam, 2) },
        kit: { ...kit, augments: [...kit.augments] },
        oppNextIntent: null,
        routeTrace: null,
        oppStartCost: 0,
        par: 0,
        patchPouch: [...kit.patchPouch],
        severedStreak: 0,
        strainChip: 0,
        rngState: seedRng(seed ^ 1597463007),
        claimCounter: 0,
        fx: [],
        fxNext: 1,
        notice: null,
        oppTurn: { started: false, pendingCast: null, queue: [], replans: 3, lastReplanCost: Infinity, ramAtStart: 0, aim: null },
        oppDominantUsed: false,
        lastPlayerHitRound: 0,
        tutFlags: { scanned: false, purged: false, attacked: false },
        tutorialLessonRound: 0
      };
      const fp = runFlood(s2, "player");
      const fo = runFlood(s2, "opp");
      if (fp.reachedCore || fo.reachedCore)
        continue;
      if (fp.claimed.length > MAX_OPENING_CLAIM || fo.claimed.length > MAX_OPENING_CLAIM)
        continue;
      const pd = routeCost(s2, "player");
      const od = routeCost(s2, "opp");
      if (!isFinite(pd) || !isFinite(od))
        continue;
      if (Math.abs(pd - od) > 2)
        continue;
      const shorter = Math.min(pd, od);
      const score = Math.abs(shorter - cfg.minCost);
      let shortcutOk = true;
      if (!cfg.tutorial && cfg.minPd !== undefined) {
        let shortcut = pd;
        for (let i = 0;i < s2.cells.length && shortcut > cfg.minPd - 6; i++) {
          if (!canPlace(s2, "player", i))
            continue;
          const c = s2.cells[i];
          const prev = { kind: c.kind, base: c.base, rot: c.rot, fused: c.fused };
          c.kind = "node";
          c.base = PIECE_X;
          c.rot = 0;
          c.fused = true;
          const after = routeCost(s2, "player");
          c.kind = prev.kind;
          c.base = prev.base;
          c.rot = prev.rot;
          c.fused = prev.fused;
          if (after < shortcut)
            shortcut = after;
        }
        shortcutOk = shortcut > cfg.minPd - 6;
      }
      const looseOk = cfg.tutorial ? pd > playerRamPerTurn * 2 + 1 : shortcutOk && pd > Math.max(playerRamPerTurn, (cfg.minPd ?? 0) - 2);
      if (looseOk && score < looseScore) {
        looseScore = score;
        loose = s2;
      } else if (!looseOk && cfg.tutorial && pd > playerRamPerTurn + 3 && score < lastResortScore) {
        lastResortScore = score;
        lastResort = s2;
      }
      if (!cfg.tutorial && score < anyFairScore) {
        anyFairScore = score;
        anyFair = s2;
      }
      if (cfg.tutorial) {
        if (od <= cfg.oppRam || od > cfg.oppRam * 2 || pd <= playerRamPerTurn * 2 + 3)
          continue;
      } else {
        const pdFloor = Math.max(playerRamPerTurn, cfg.minPd ?? 0);
        if (pd <= pdFloor || od <= cfg.oppRam || !shortcutOk)
          continue;
      }
      if (score < bestScore) {
        bestScore = score;
        best = s2;
        if (score <= 1)
          break;
      }
    }
    let s = best ?? loose ?? lastResort;
    if (!s) {
      const maxRetry = cfg.minPd !== undefined ? 12 : 5;
      if (retry >= maxRetry) {
        if (anyFair) {
          s = anyFair;
        } else if (cfg.minPd !== undefined) {
          return createDuel({ ...cfg, minPd: undefined }, seed, kit, playerRamPerTurn, 0);
        } else {
          throw new Error("duel generator could not produce a fair board");
        }
      } else {
        return createDuel(cfg, seed + 40503 >>> 0, kit, playerRamPerTurn, retry + 1);
      }
    }
    if (cfg.headStart > 0) {
      const applied = [];
      for (let k = 0;k < cfg.headStart; k++) {
        const plan = routePlan(s, "opp");
        if (!plan)
          break;
        const next = plan.path.find((p) => s.cells[p.idx].owner === "none");
        if (!next)
          break;
        const c = s.cells[next.idx];
        const core = s.cells[s.coreIdx];
        if (Math.abs(c.x - core.x) + Math.abs(c.y - core.y) <= 1)
          break;
        const prev = { idx: next.idx, rot: c.rot, spin: c.spin };
        const turns = (next.targetRot - c.rot + 4) % 4;
        c.rot = next.targetRot;
        c.spin += turns;
        c.owner = "opp";
        c.claimSeq = ++s.claimCounter;
        c.claimWave = 0;
        if (!isFinite(routeCost(s, "player"))) {
          c.rot = prev.rot;
          c.spin = prev.spin;
          c.owner = "none";
          c.claimSeq = 0;
          break;
        }
        applied.push(prev);
      }
      const flood = runFlood(s, "opp");
      if (!isFinite(routeCost(s, "player"))) {
        for (const i of flood.claimed) {
          s.cells[i].owner = "none";
          s.cells[i].claimSeq = 0;
        }
        for (const u of [...applied].reverse()) {
          const c = s.cells[u.idx];
          c.rot = u.rot;
          c.spin = u.spin;
          c.owner = "none";
          c.claimSeq = 0;
        }
      }
    }
    {
      const rc = routeCost(s, "opp");
      s.oppStartCost = Math.max(1, isFinite(rc) ? rc : cfg.minCost);
    }
    {
      const pd = routeCost(s, "player");
      const base = isFinite(pd) ? pd : cfg.minCost;
      s.par = Math.ceil(base * PAR_RATE) + (cfg.parFlat ?? PAR_FLAT);
    }
    s.power = computeDuelPower(s);
    s.econ.player.ram = playerRamPerTurn + (kit.augments.includes("hotBoot") ? 1 : 0);
    if (cfg.oppOpens && !cfg.tutorial) {
      startOppTurn(s);
    }
    return s;
  }

  // engine/opponent.ts
  function coreDist(s, idx) {
    const c = s.cells[idx];
    const core = s.cells[s.coreIdx];
    return Math.abs(c.x - core.x) + Math.abs(c.y - core.y);
  }
  var ATTACK_MODES = ["redirect", "armHalt", "armSiphon"];
  function progOf(mode) {
    return ATTACK_MODES.includes(mode) ? "attack" : "defend";
  }
  function decideProgram(s) {
    const econ = s.econ.opp;
    if (econ.ram < 1)
      return;
    const atk = s.cfg.oppAttackModes;
    const def = s.cfg.oppDefendModes;
    if (s.cfg.tutorial) {
      const hasTrap = s.cells.some((c) => c.trap && c.trap.by === "opp");
      if (!tutorialLessonDone(s) && !hasTrap && !econ.used.attack && atk.length > 0) {
        s.oppTurn.pendingCast = { prog: "attack", mode: atk[0] };
      }
      return;
    }
    const playerCost = routeCost(s, "player");
    const ownCost = routeCost(s, "opp");
    if (isFinite(playerCost) && playerCost <= 4 && playerCost <= ownCost && !econ.used.attack) {
      const armMode = atk.find((m) => m !== "redirect");
      if (armMode && roll(s) < 0.55) {
        s.oppTurn.pendingCast = { prog: "attack", mode: armMode };
        return;
      }
      if (atk.includes("redirect")) {
        s.oppTurn.pendingCast = { prog: "attack", mode: "redirect" };
        return;
      }
      if (def.includes("lock") && !econ.used.defend) {
        s.oppTurn.pendingCast = { prog: "defend", mode: "lock" };
        return;
      }
    }
    if (def.includes("purge") && !econ.used.defend) {
      const plan = routePlan(s, "opp");
      const trapped = plan?.path.some((p) => {
        const c = s.cells[p.idx];
        return c.trap && c.trap.by === "player";
      });
      if (trapped && roll(s) < 0.7) {
        s.oppTurn.pendingCast = { prog: "defend", mode: "purge" };
        return;
      }
    }
    if (s.lastPlayerHitRound >= s.round - 1 && s.lastPlayerHitRound > 0 && roll(s) < 0.5) {
      const guard = def.find((m) => m === "lock") ?? def.find((m) => m === "ward");
      if (guard && !econ.used.defend) {
        s.oppTurn.pendingCast = { prog: "defend", mode: guard };
        return;
      }
    }
    if (!s.oppDominantUsed && s.round >= 2) {
      const dom = s.cfg.dominant;
      const prog = progOf(dom);
      const available = prog === "attack" ? atk.includes(dom) : def.includes(dom);
      if (available && !econ.used[prog]) {
        s.oppTurn.pendingCast = { prog, mode: dom };
        return;
      }
    }
    if (roll(s) < s.cfg.abilityFreq) {
      const pool = [];
      for (const m of atk)
        if (!econ.used.attack)
          pool.push({ prog: "attack", mode: m });
      for (const m of def)
        if (!econ.used.defend)
          pool.push({ prog: "defend", mode: m });
      for (const entry of [...pool])
        if (entry.mode === s.cfg.dominant)
          pool.push(entry);
      if (pool.length > 0) {
        s.oppTurn.pendingCast = pool[Math.floor(roll(s) * pool.length)];
      }
    }
  }
  function computeIntent(s) {
    if (s.oppTurn.pendingCast) {
      s.oppNextIntent = `Charging ${s.oppTurn.pendingCast.mode.toUpperCase()}`;
      return;
    }
    const cost = routeCost(s, "opp");
    if (!isFinite(cost))
      s.oppNextIntent = "Probing for a route";
    else if (cost <= 3)
      s.oppNextIntent = "FINAL APPROACH to the core";
    else
      s.oppNextIntent = "Aligning junctions toward the core";
  }
  function prepareCastFor(s, side, prog, mode) {
    const enemy = otherSide(side);
    const width = prog === "attack" ? ATTACK_WIDTH[tierOf(s, side, "attack")] : DEFEND_WIDTH[tierOf(s, side, "defend")];
    const targets = [];
    switch (mode) {
      case "armHalt":
      case "armSiphon": {
        const plan = routePlan(s, enemy);
        let pool = (plan ? plan.path.map((p) => p.idx) : []).filter((i) => armTargetLegal(s, side, i));
        if (!s.cfg.tutorial)
          pool = pool.reverse();
        if (pool.length === 0) {
          pool = s.cells.map((_, i) => i).filter((i) => armTargetLegal(s, side, i) && isFrontier(s, enemy, i));
        }
        targets.push(...pool.slice(0, width));
        if (targets.length === 0)
          return null;
        break;
      }
      case "redirect": {
        const candidates = s.cells.map((_, i) => i).filter((i) => redirectTargetLegal(s, side, i) && s.cells[i].owner === enemy).sort((a, b) => coreDist(s, a) - coreDist(s, b)).slice(0, 6);
        let best = -1;
        let bestGain = -1;
        const before = routeCost(s, enemy);
        for (const i of candidates) {
          const c = s.cells[i];
          c.rot = (c.rot + 1) % 4;
          const after = routeCost(s, enemy);
          c.rot = (c.rot + 3) % 4;
          const gain = (isFinite(after) ? after : 99) - (isFinite(before) ? before : 99);
          if (gain > bestGain) {
            bestGain = gain;
            best = i;
          }
        }
        if (best === -1)
          return null;
        targets.push(best);
        targets.push(...candidates.filter((i) => i !== best).slice(0, width - 1));
        break;
      }
      case "purge": {
        const plan = routePlan(s, side);
        const onRoute = (plan ? plan.path.map((p) => p.idx) : []).filter((i) => purgeTargetLegal(s, side, i));
        const anywhere = s.cells.map((_, i) => i).filter((i) => purgeTargetLegal(s, side, i));
        const pool = [...new Set([...onRoute, ...anywhere])];
        targets.push(...pool.slice(0, width));
        if (targets.length === 0)
          return null;
        break;
      }
      case "lock": {
        const enemyCost = routeCost(s, enemy);
        if (isFinite(enemyCost) && enemyCost <= 4) {
          const plan = routePlan(s, enemy);
          const chokes = (plan?.path ?? []).filter((p) => s.cells[p.idx].owner === "none" && lockTargetLegal(s, side, p.idx)).map((p) => p.idx);
          targets.push(...chokes.slice(0, width));
        }
        if (targets.length < width) {
          const own = s.cells.map((_, i) => i).filter((i) => s.cells[i].owner === side && lockTargetLegal(s, side, i) && !targets.includes(i)).sort((a, b) => coreDist(s, a) - coreDist(s, b));
          targets.push(...own.slice(0, width - targets.length));
        }
        if (targets.length === 0)
          return null;
        break;
      }
      case "ward": {
        const plan = routePlan(s, side);
        const ahead = plan?.path.find((p) => s.cells[p.idx].owner === "none" && wardTargetLegal(s, side, p.idx));
        if (!ahead)
          return null;
        targets.push(ahead.idx);
        break;
      }
    }
    return { kind: "cast", prog, mode, targets };
  }
  function prepareCast(s) {
    const pc = s.oppTurn.pendingCast;
    if (!pc)
      return null;
    s.oppTurn.pendingCast = null;
    const econ = s.econ.opp;
    if (econ.used[pc.prog] || econ.ram < 1)
      return null;
    return prepareCastFor(s, "opp", pc.prog, pc.mode);
  }
  function executeCast(s, aim) {
    const econ = s.econ.opp;
    if (econ.used[aim.prog] || econ.ram < 1)
      return;
    applyCast(s, "opp", aim.prog, aim.mode, aim.targets);
    if (aim.mode === s.cfg.dominant)
      s.oppDominantUsed = true;
  }
  function buildQueue(s, side) {
    let plan = routePlan(s, side);
    if (plan && plan.steps.some((p) => s.cells[p.idx].lockedThroughRound >= s.round && s.cells[p.idx].lockedBy !== side)) {
      const avoid = new Set(plan.steps.filter((p) => s.cells[p.idx].lockedThroughRound >= s.round && s.cells[p.idx].lockedBy !== side).map((p) => p.idx));
      plan = routePlan(s, side, avoid) ?? plan;
    }
    if (!plan)
      return [];
    return plan.steps.map((p) => ({ idx: p.idx, targetRot: p.targetRot }));
  }
  function pickFromQueue(s, side, queue, greed, replan) {
    const econ = s.econ[side];
    if (econ.ram < 1)
      return -1;
    while (queue.length > 0 && s.cells[queue[0].idx].rot === queue[0].targetRot)
      queue.shift();
    let head = queue[0];
    if (!head) {
      replan();
      while (queue.length > 0 && s.cells[queue[0].idx].rot === queue[0].targetRot)
        queue.shift();
      head = queue[0];
      if (!head)
        return -1;
    }
    if (!canRotate(s, side, head.idx)) {
      queue.length = 0;
      replan();
      while (queue.length > 0 && s.cells[queue[0].idx].rot === queue[0].targetRot)
        queue.shift();
      head = queue[0];
      if (!head || !canRotate(s, side, head.idx))
        return -1;
    }
    if (roll(s) >= greed) {
      const pool = s.cells.map((_, i) => i).filter((i) => i !== head.idx && canRotate(s, side, i) && s.cells[i].owner === "none");
      if (pool.length > 0) {
        return pool[Math.floor(roll(s) * pool.length)];
      }
    }
    return head.idx;
  }
  function queueRotateStep(s, side, queue, greed, replan) {
    const idx = pickFromQueue(s, side, queue, greed, replan);
    if (idx === -1)
      return false;
    return applyRotate(s, side, idx);
  }
  function makeReplanner(s, side, queue, mem) {
    return () => {
      if (mem.n <= 0)
        return;
      const cost = routeCost(s, side);
      if (!(cost < mem.lastCost)) {
        return;
      }
      mem.lastCost = cost;
      mem.n--;
      queue.length = 0;
      queue.push(...buildQueue(s, side));
    };
  }
  function botPlayTurn(s, side, greed) {
    const queue = buildQueue(s, side);
    const mem = { n: 3, lastCost: Infinity };
    const replan = makeReplanner(s, side, queue, mem);
    let guard = 0;
    while (s.phase === "playing" && s.turn === side && s.econ[side].ram >= 1 && guard++ < 40) {
      if (!queueRotateStep(s, side, queue, greed, replan))
        break;
    }
  }
  function oppStep(s) {
    if (s.phase !== "playing" || s.turn !== "opp")
      return;
    const ot = s.oppTurn;
    if (s.cfg.tutorial && !isFinite(routeCost(s, "opp"))) {
      finishDuel(s, "opp", "core", "The machine stopped pretending and sealed itself. The door was never really open.");
      return;
    }
    if (!ot.started) {
      ot.started = true;
      decideProgram(s);
      computeIntent(s);
      ot.queue = buildQueue(s, "opp");
      return;
    }
    if (ot.aim) {
      const aim = ot.aim;
      ot.aim = null;
      if (aim.kind === "cast") {
        executeCast(s, aim);
        ot.queue = buildQueue(s, "opp");
        return;
      }
      if (canRotate(s, "opp", aim.idx) && s.econ.opp.ram >= 1) {
        applyRotate(s, "opp", aim.idx);
        return;
      }
    }
    if (ot.pendingCast) {
      const prepared = prepareCast(s);
      if (prepared) {
        ot.aim = prepared;
        emit(s, `oppCast:${prepared.mode}`);
        return;
      }
    }
    if (s.cfg.tutorial && (!tutorialLessonDone(s) || s.round <= s.tutorialLessonRound) && ot.ramAtStart - s.econ.opp.ram >= 4) {
      endOppTurn(s);
      return;
    }
    const mem = { n: ot.replans, lastCost: ot.lastReplanCost };
    const replan = makeReplanner(s, "opp", ot.queue, mem);
    const idx = pickFromQueue(s, "opp", ot.queue, s.cfg.greed, replan);
    ot.replans = mem.n;
    ot.lastReplanCost = mem.lastCost;
    if (idx !== -1) {
      ot.aim = { kind: "rotate", idx };
      emit(s, "oppAim", idx);
      return;
    }
    endOppTurn(s);
  }

  // engine/duel-reducer.ts
  function cloneState(s) {
    return {
      ...s,
      cells: s.cells.map((c) => ({ ...c, trap: c.trap ? { ...c.trap } : null })),
      econ: {
        player: { ...s.econ.player, used: { ...s.econ.player.used } },
        opp: { ...s.econ.opp, used: { ...s.econ.opp.used } }
      },
      kit: { ...s.kit, augments: [...s.kit.augments], patchPouch: [...s.kit.patchPouch] },
      patchPouch: [...s.patchPouch],
      tutFlags: { ...s.tutFlags },
      oppTurn: { ...s.oppTurn },
      fx: [...s.fx]
    };
  }
  function playerCanAct(s) {
    return s.phase === "playing" && s.turn === "player";
  }
  function deny(s, msg) {
    emit(s, "deny");
    if (msg)
      say(s, msg);
    return s;
  }
  function duelReducer(state, action) {
    switch (action.type) {
      case "fxDrain": {
        if (state.fx.length === 0)
          return state;
        return { ...state, fx: state.fx.filter((e) => e.id > action.upTo) };
      }
      case "rotate": {
        if (!playerCanAct(state))
          return state;
        const s = cloneState(state);
        if (s.econ.player.ram < 1)
          return deny(s, "No RAM left. End the turn.");
        if (!canRotate(s, "player", action.idx)) {
          const c = s.cells[action.idx];
          if (c && c.kind === "node" && c.fused) {
            return deny(s, "That junction is welded. A placed piece never turns.");
          }
          if (c && c.lockedThroughRound >= s.round && c.lockedBy === "opp") {
            return deny(s, "That junction is clamped frozen.");
          }
          if (c && c.kind === "node" && c.owner === "opp") {
            return deny(s, "Enemy territory. ATTACK: REDIRECT can reach it.");
          }
          return deny(s, "Out of reach. Work outward from your territory.");
        }
        applyRotate(s, "player", action.idx);
        return s;
      }
      case "place": {
        if (!playerCanAct(state))
          return state;
        const s = cloneState(state);
        if (s.patchPouch.length < 1)
          return deny(s, "The pouch is empty.");
        if (s.econ.player.placedThisTurn)
          return deny(s, "One patch piece per turn.");
        if (s.econ.player.ram < PLACE_COST)
          return deny(s, "Placing a piece takes 2 RAM.");
        if (s.patchPouch[action.pouchIdx] !== action.mask)
          return deny(s);
        if (!canPlace(s, "player", action.idx)) {
          return deny(s, "Patch pieces only fill slag within reach of your territory.");
        }
        applyPlace(s, "player", action.idx, action.pouchIdx);
        return s;
      }
      case "cast": {
        if (!playerCanAct(state))
          return state;
        const s = cloneState(state);
        const econ = s.econ.player;
        const prog = action.prog;
        if (!programUnlocked(s, prog))
          return deny(s, "That program is still offline. Follow the bench notes.");
        if (econ.used[prog])
          return deny(s, "Each program runs once per turn.");
        if (econ.ram < programCost(s, "player", prog))
          return deny(s, "Not enough RAM.");
        const t = action.targets;
        if (prog === "scan") {
          applyCast(s, "player", "scan", null, []);
          return s;
        }
        if (prog === "attack") {
          const want2 = ATTACK_WIDTH[tierOf(s, "player", "attack")];
          if (t.length < 1 || t.length > want2)
            return deny(s);
          if (!t.every((i) => attackTargetLegal(s, "player", s.kit.attackMode, i)))
            return deny(s);
          applyCast(s, "player", "attack", s.kit.attackMode, t);
          return s;
        }
        const want = s.kit.defendMode === "ward" ? 1 : DEFEND_WIDTH[tierOf(s, "player", "defend")];
        if (t.length < 1 || t.length > want)
          return deny(s);
        if (!t.every((i) => defendTargetLegal(s, "player", s.kit.defendMode, i)))
          return deny(s);
        applyCast(s, "player", "defend", s.kit.defendMode, t);
        return s;
      }
      case "endTurn": {
        if (!playerCanAct(state))
          return state;
        const s = cloneState(state);
        endPlayerTurn(s);
        return s;
      }
      case "oppStep": {
        if (state.phase !== "playing" || state.turn !== "opp")
          return state;
        const s = cloneState(state);
        oppStep(s);
        return s;
      }
    }
  }

  // engine/index.ts
  function specToConfig(spec) {
    return {
      w: spec.grid[0],
      h: spec.grid[1],
      oppRam: spec.oppRam,
      greed: spec.greed,
      abilityFreq: 0,
      minCost: spec.minCost,
      minPd: spec.minPd,
      headStart: spec.headStart,
      oppAttackModes: ["redirect"],
      oppDefendModes: [],
      oppTier: 1,
      dominant: "redirect",
      parFlat: spec.parFlat,
      slag: spec.slag
    };
  }

  // engine/browser-entry.ts
  globalThis.KP = {
    createDuel,
    duelReducer,
    canRotate,
    routeCost,
    rotateArms,
    specToConfig,
    ROUND_CAP,
    BASE_KIT,
    botPlayTurn,
    oppStep,
    endPlayerTurn
  };
})();
