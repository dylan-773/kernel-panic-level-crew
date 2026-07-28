/**
 * The dive, playable.
 *
 * Renders the real engine's DuelState as SVG and drives it with two inputs:
 * click a junction to rotate it, or end the turn. There is nothing else,
 * because a dive has nothing else. Rotating costs 1 RAM, RAM refills each
 * turn, your signal floods through aligned arms and claims what it reaches,
 * and the first flood to touch the core wins.
 *
 * Expects globals: KP (engine bundle) and DIVE (the crew's spec, inlined).
 */

(function () {
  "use strict";

  var CS = 48;
  var HALF = CS / 2;
  var SVGNS = "http://www.w3.org/2000/svg";

  var spec = window.DIVE;
  var cfg = KP.specToConfig(spec);
  var state = null;
  var seed = spec.seed || 1;
  var oppTimer = null;

  /* ---------------------------------------------------------------- */
  /* svg helpers                                                       */
  /* ---------------------------------------------------------------- */

  function el(name, attrs, cls) {
    var n = document.createElementNS(SVGNS, name);
    if (attrs) for (var k in attrs) n.setAttribute(k, attrs[k]);
    if (cls) n.setAttribute("class", cls);
    return n;
  }

  /** Arm lines for a 4-bit mask. Direction order matches the engine: N E S W. */
  function armLines(parent, mask, cls, width, half) {
    half = half === undefined ? 24 : half;
    var ends = [[0, -half], [half, 0], [0, half], [-half, 0]];
    for (var d = 0; d < 4; d++) {
      if ((mask & (1 << d)) === 0) continue;
      parent.appendChild(el("line", {
        x1: 0, y1: 0, x2: ends[d][0], y2: ends[d][1], "stroke-width": width,
      }, cls));
    }
  }

  /* ---------------------------------------------------------------- */
  /* board                                                             */
  /* ---------------------------------------------------------------- */

  function legalSet() {
    var out = {};
    if (!state || state.phase !== "playing" || state.turn !== "player") return out;
    if (state.econ.player.ram < 1) return out;
    for (var i = 0; i < state.cells.length; i++) {
      if (KP.canRotate(state, "player", i)) out[i] = true;
    }
    return out;
  }

  function drawCell(root, cell, idx, legal) {
    var mine = cell.owner === "player";
    var theirs = cell.owner === "opp";
    var lit = mine ? !!state.power.player[idx] : theirs ? !!state.power.opp[idx] : false;

    var classes = ["kp-dcell"];
    if (cell.kind === "node") {
      classes.push(mine ? "kp-dcell-p" : theirs ? "kp-dcell-o" : "kp-dcell-n");
      if (lit) classes.push("kp-dlit");
    }
    if (legal) classes.push("kp-dlegal", "kp-dlive");

    var g = el("g", { transform: "translate(" + (cell.x * CS + HALF) + " " + (cell.y * CS + HALF) + ")" },
      classes.join(" "));

    g.appendChild(el("rect", { x: -HALF, y: -HALF, width: CS, height: CS, fill: "transparent" }));

    if (legal) {
      g.setAttribute("role", "button");
      g.setAttribute("tabindex", "0");
      g.style.cursor = "pointer";
      g.addEventListener("click", function () { rotate(idx); });
      g.addEventListener("keydown", function (e) {
        if (e.key === "Enter" || e.key === " ") { e.preventDefault(); rotate(idx); }
      });
    }

    var armClass = mine ? "kp-darm-p" : theirs ? "kp-darm-o" : "kp-darm-n";

    if (cell.kind === "block") {
      var b = el("g", null, "kp-dblock");
      b.appendChild(el("polygon", { points: "-14,-8 -4,-15 9,-12 15,-2 10,10 -2,14 -13,7" }, "kp-dblock-body"));
      b.appendChild(el("path", { d: "M -6 -4 L 4 5 M 2 -7 L -2 2" }, "kp-dblock-crack"));
      g.appendChild(b);
    }

    if (cell.kind === "node") {
      var n = el("g", null, cell.claimSeq > 0 ? "kp-claimpop" : null);
      if (cell.claimSeq > 0) n.style.animationDelay = cell.claimWave * 55 + "ms";
      if (legal) {
        n.appendChild(el("rect", {
          x: -HALF + 4, y: -HALF + 4, width: CS - 8, height: CS - 8,
        }, "kp-dlegal-ring"));
      }
      var arms = el("g", null, "kp-darms");
      arms.style.transform = "rotate(" + cell.spin * 90 + "deg)";
      armLines(arms, cell.base, armClass, 6);
      if (lit) {
        armLines(arms, cell.base, armClass + "-glow", 12);
        armLines(arms, cell.base, armClass + "-lit", 3);
      }
      n.appendChild(arms);
      n.appendChild(el("circle", { r: mine || theirs ? 6.5 : 5 },
        "kp-dnode " + (mine ? "kp-dnode-p" : theirs ? "kp-dnode-o" : "kp-dnode-n")));
      g.appendChild(n);
    }

    if (cell.kind === "entryP" || cell.kind === "entryO") {
      var isP = cell.kind === "entryP";
      var p = el("g", null, "kp-dport " + (isP ? "kp-dport-p" : "kp-dport-o"));
      var pa = el("g");
      armLines(pa, KP.rotateArms(cell.base, cell.rot), isP ? "kp-darm-p-lit" : "kp-darm-o-lit", 5);
      p.appendChild(pa);
      p.appendChild(el("rect", { x: -11, y: -11, width: 22, height: 22 }, "kp-dport-body"));
      p.appendChild(el("circle", { r: 4.5 }, "kp-dport-eye"));
      var tag = el("text", { y: 22 }, isP ? "kp-dtag" : "kp-dtag kp-dtag-o");
      tag.textContent = isP ? "YOU" : "SIG-0";
      p.appendChild(tag);
      g.appendChild(p);
    }

    if (cell.kind === "core") {
      var coreLit = !!state.power.player[idx] || !!state.power.opp[idx];
      var c = el("g", null, coreLit ? "kp-dcore kp-dcore-lit" : "kp-dcore");
      var ca = el("g");
      armLines(ca, cell.base, "kp-darm-core", 5);
      c.appendChild(ca);
      c.appendChild(el("polygon", {
        points: "14,0 9.9,9.9 0,14 -9.9,9.9 -14,0 -9.9,-9.9 0,-14 9.9,-9.9",
      }, "kp-dcore-body"));
      c.appendChild(el("circle", { r: 5 }, "kp-dcore-eye"));
      c.appendChild(el("circle", { r: 19 }, "kp-dcore-ring"));
      var ct = el("text", { y: 29 }, "kp-dtag");
      ct.textContent = "CORE";
      c.appendChild(ct);
      g.appendChild(c);
    }

    root.appendChild(g);
  }

  function drawBoard() {
    var host = document.getElementById("board");
    host.textContent = "";
    var w = state.w, h = state.h;
    var vw = w * CS, vh = h * CS;

    var svg = el("svg", {
      viewBox: "-8 -8 " + (vw + 16) + " " + (vh + 16),
      role: "application",
      "aria-label": "Dive grid, " + w + " by " + h,
    }, "kp-dboard kp-dphase-" + state.phase);

    var defs = el("defs");
    var pat = el("pattern", {
      id: "kpDDots", width: CS, height: CS, patternUnits: "userSpaceOnUse",
    });
    pat.appendChild(el("circle", { cx: HALF, cy: HALF, r: 1.2 }, "kp-dot"));
    defs.appendChild(pat);
    svg.appendChild(defs);

    svg.appendChild(el("rect", { x: -6, y: -6, width: vw + 12, height: vh + 12 }, "kp-dboard-bg"));
    svg.appendChild(el("rect", { x: 0, y: 0, width: vw, height: vh, fill: "url(#kpDDots)" }));
    svg.appendChild(el("rect", { x: -6, y: -6, width: vw + 12, height: vh + 12 }, "kp-dboard-frame"));

    var legal = legalSet();
    for (var i = 0; i < state.cells.length; i++) drawCell(svg, state.cells[i], i, !!legal[i]);
    host.appendChild(svg);
  }

  /* ---------------------------------------------------------------- */
  /* hud                                                               */
  /* ---------------------------------------------------------------- */

  function setText(id, v) { document.getElementById(id).textContent = v; }

  function drawHud() {
    var e = state.econ.player;
    setText("ram", e.ram + " / " + e.ramPerTurn);
    setText("round", state.round + " / " + KP.ROUND_CAP);
    setText("turn", state.turn === "player" ? "YOUR TURN" : "SIG-0");
    setText("rotations", e.rotations);
    setText("par", state.par);

    var pips = document.getElementById("rampips");
    pips.textContent = "";
    for (var i = 0; i < e.ramPerTurn; i++) {
      var d = document.createElement("span");
      d.className = "kp-pip" + (i < e.ram ? " kp-pip-on" : "");
      pips.appendChild(d);
    }

    document.getElementById("endturn").disabled =
      state.phase !== "playing" || state.turn !== "player";

    var note = document.getElementById("note");
    if (state.phase === "won") {
      note.textContent = "CORE REACHED. The dive is yours.";
      note.className = "kp-note kp-note-win";
    } else if (state.phase === "lost") {
      note.textContent = state.endReason || "SIG-0 reached the core first.";
      note.className = "kp-note kp-note-loss";
    } else if (state.turn === "opp") {
      note.textContent = "SIG-0 is moving.";
      note.className = "kp-note";
    } else if (state.econ.player.ram < 1) {
      note.textContent = "No RAM left. End the turn.";
      note.className = "kp-note";
    } else if (state.notice) {
      note.textContent = state.notice.text;
      note.className = "kp-note";
    } else {
      note.textContent = "Rotate a junction to steer your signal toward the core.";
      note.className = "kp-note";
    }
  }

  function render() { drawBoard(); drawHud(); }

  /* ---------------------------------------------------------------- */
  /* turn loop                                                         */
  /* ---------------------------------------------------------------- */

  function rotate(idx) {
    if (state.phase !== "playing" || state.turn !== "player") return;
    var next = KP.duelReducer(state, { type: "rotate", idx: idx });
    if (next === state) return;
    state = next;
    render();
  }

  function endTurn() {
    if (state.phase !== "playing" || state.turn !== "player") return;
    state = KP.duelReducer(state, { type: "endTurn" });
    render();
    pumpOpponent();
  }

  /**
   * The opponent moves on a timer rather than instantly, so a cascade is
   * something you watch happen instead of something you find already done.
   */
  function pumpOpponent() {
    clearTimeout(oppTimer);
    if (state.phase !== "playing" || state.turn !== "opp") return;
    oppTimer = setTimeout(function () {
      var next = KP.duelReducer(state, { type: "oppStep" });
      if (next !== state) { state = next; render(); }
      pumpOpponent();
    }, 260);
  }

  function start(newSeed) {
    clearTimeout(oppTimer);
    seed = newSeed;
    state = KP.createDuel(cfg, seed, spec.playerRam);
    setText("seed", seed);
    render();
    pumpOpponent();
  }

  /* ---------------------------------------------------------------- */
  /* boot                                                              */
  /* ---------------------------------------------------------------- */

  document.getElementById("endturn").addEventListener("click", endTurn);
  document.getElementById("again").addEventListener("click", function () { start(seed); });
  document.getElementById("next").addEventListener("click", function () { start(seed + 1); });
  document.addEventListener("keydown", function (e) {
    if (e.key === "Enter" && !e.repeat) { e.preventDefault(); endTurn(); }
  });

  setText("difficulty", String(spec.difficulty).toUpperCase());
  setText("gridlabel", spec.grid[0] + " x " + spec.grid[1]);
  setText("target", spec.targetWinPct + "%");
  start(seed);
})();
