(() => {
  // engine/constants.ts
  var BASE_REACH = 2;
  var PAR_RATE = 1.25;
  var PAR_FLAT = 2;
  function cascadeRam(claimed) {
    return Math.min(2, Math.floor(claimed / 4));
  }

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
    const reached = new Array(s.cells.length).fill(false);
    const claimed = [];
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
        }
        queue.push(ni);
      }
    }
    return { reached, claimed, reachedCore };
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
        const rerouted = routePlan(s, side, nextAvoid, depth + 1);
        if (rerouted)
          return rerouted;
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
  function inReach(s, side, idx, reach) {
    const c0 = s.cells[idx];
    if (c0.kind !== "node" || c0.owner !== "none")
      return false;
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
    if (c.owner === side)
      return true;
    if (c.owner !== "none")
      return false;
    return inReach(s, side, idx, BASE_REACH);
  }

  // engine/duel-types.ts
  function otherSide(s) {
    return s === "player" ? "opp" : "player";
  }
  var PIECE_I = 5;
  var PIECE_L = 3;
  var PIECE_T = 7;
  var PIECE_X = 15;
  var ROUND_CAP = 25;

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
      rotations: 0
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
        const slag = !protectedCell && rng.next() < (cfg.slag ?? 0.18);
        cells.push({
          x,
          y,
          kind: slag ? "block" : "node",
          base: slag ? 0 : drawMask(rng),
          rot: slag ? 0 : rng.int(4),
          spin: 0,
          owner: "none",
          claimSeq: 0,
          claimWave: 0
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
  function createDuel(cfg, seed, playerRamPerTurn, retry = 0) {
    const rng = new Rng(seed ^ 625341585);
    const carryCap = 2;
    let best = null;
    let bestScore = Infinity;
    let loose = null;
    let looseScore = Infinity;
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
        oppNextIntent: null,
        oppStartCost: 0,
        par: 0,
        severedStreak: 0,
        rngState: seedRng(seed ^ 1597463007),
        claimCounter: 0,
        fx: [],
        fxNext: 1,
        notice: null,
        oppTurn: { started: false, queue: [], replans: 3, lastReplanCost: Infinity, aim: null }
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
      const looseOk = pd > Math.max(playerRamPerTurn, (cfg.minPd ?? 0) - 2);
      if (looseOk && score < looseScore) {
        looseScore = score;
        loose = s2;
      }
      if (score < anyFairScore) {
        anyFairScore = score;
        anyFair = s2;
      }
      const pdFloor = Math.max(playerRamPerTurn, cfg.minPd ?? 0);
      if (pd <= pdFloor || od <= cfg.oppRam)
        continue;
      if (score < bestScore) {
        bestScore = score;
        best = s2;
        if (score <= 1)
          break;
      }
    }
    let s = best ?? loose;
    if (!s) {
      const maxRetry = cfg.minPd !== undefined ? 12 : 5;
      if (retry >= maxRetry) {
        if (anyFair) {
          s = anyFair;
        } else if (cfg.minPd !== undefined) {
          return createDuel({ ...cfg, minPd: undefined }, seed, playerRamPerTurn, 0);
        } else {
          throw new Error("dive generator could not produce a fair board");
        }
      } else {
        return createDuel(cfg, seed + 40503 >>> 0, playerRamPerTurn, retry + 1);
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
    s.econ.player.ram = playerRamPerTurn;
    return s;
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
  function finishDuel(s, winner, kind, reason) {
    s.phase = winner === "player" ? "won" : "lost";
    s.winKind = kind;
    if (reason)
      s.endReason = reason;
    s.notice = null;
    emit(s, winner === "player" ? "win" : "lose");
  }
  function settleFloods(s, acting) {
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
      const bonus = cascadeRam(f.claimed.length);
      if (bonus > 0) {
        s.econ[side].drainNext -= bonus;
        emit(s, mine ? "cascadeRam" : "cascadeRamOpp", bonus);
      }
      if (f.reachedCore) {
        finishDuel(s, side, "core", side === "player" ? "Your flood touched the core first. The intrusion collapses." : "Its flood reached the core before yours did.");
      }
    }
    s.power = computeDuelPower(s);
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
    settleFloods(s, side);
    return true;
  }
  function beginTurnEconomy(s, side) {
    const econ = s.econ[side];
    const ram = econ.ramPerTurn + econ.carry - econ.drainNext;
    econ.drainNext = 0;
    econ.ram = Math.max(0, ram);
    econ.carry = 0;
  }
  function startOppTurn(s) {
    s.turn = "opp";
    s.oppTurn = { started: false, queue: [], replans: 3, lastReplanCost: Infinity, aim: null };
    beginTurnEconomy(s, "opp");
  }
  function playerHasRoute(s) {
    return isFinite(routeCost(s, "player"));
  }
  function endOppTurn(s) {
    if (s.phase !== "playing")
      return;
    const econ = s.econ.opp;
    econ.carry = Math.min(econ.carryCap, Math.max(0, econ.ram));
    s.round++;
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
          finishDuel(s, "opp", "severed", "SEVERED. Its territory walls your port off from the core. No rotation opens a route, so the link is already lost.");
        } else {
          finishDuel(s, "player", "gridlock", "Total gridlock. Neither signal can reach the core. The link collapses in your favor.");
        }
        return;
      }
      say(s, "ROUTE LOST. No path from your port to the core. Open one this turn or the link is called.");
    } else {
      s.severedStreak = 0;
    }
    s.turn = "player";
    beginTurnEconomy(s, "player");
  }
  function endPlayerTurn(s) {
    if (s.phase !== "playing")
      return;
    const econ = s.econ.player;
    econ.carry = Math.min(econ.carryCap, Math.max(0, econ.ram));
    emit(s, "endTurn");
    startOppTurn(s);
  }

  // engine/opponent.ts
  function buildQueue(s, side) {
    const plan = routePlan(s, side);
    if (!plan)
      return [];
    return plan.steps.map((p) => ({ idx: p.idx, targetRot: p.targetRot }));
  }
  function computeIntent(s) {
    const cost = routeCost(s, "opp");
    if (!isFinite(cost))
      s.oppNextIntent = "Probing for a route";
    else if (cost <= 3)
      s.oppNextIntent = "FINAL APPROACH to the core";
    else
      s.oppNextIntent = "Aligning junctions toward the core";
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
    if (!ot.started) {
      ot.started = true;
      computeIntent(s);
      ot.queue = buildQueue(s, "opp");
      return;
    }
    if (ot.aim) {
      const aim = ot.aim;
      ot.aim = null;
      if (canRotate(s, "opp", aim.idx) && s.econ.opp.ram >= 1) {
        applyRotate(s, "opp", aim.idx);
        return;
      }
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
      cells: s.cells.map((c) => ({ ...c })),
      econ: {
        player: { ...s.econ.player },
        opp: { ...s.econ.opp }
      },
      oppTurn: { ...s.oppTurn, queue: [...s.oppTurn.queue] },
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
          if (c && c.kind === "node" && c.owner === "opp") {
            return deny(s, "Enemy territory. You cannot turn what its signal already holds.");
          }
          return deny(s, "Out of reach. Work outward from your territory.");
        }
        applyRotate(s, "player", action.idx);
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
      minCost: spec.minCost,
      minPd: spec.minPd,
      headStart: spec.headStart,
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
    botPlayTurn,
    oppStep,
    endPlayerTurn
  };
})();
