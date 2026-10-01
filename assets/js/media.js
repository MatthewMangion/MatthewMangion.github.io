/* Media pieces shared by the prototypes and the conversation sheet.
   MM.participants()      the 48-person training programme as a unit chart, one cluster per organisation
   MM.spriteStage(opts)   Matthew's pixel characters walking on a small canvas stage
   MM.maltaPoints(w, h, opts) sample Malta and Gozo (from his own coastline paths) into dot positions
   MM.drawMaltaDots(canvas, opts) a static dotted Malta for small badges */
(function () {
  "use strict";
  var MM = window.MM;
  if (!MM) return;
  var el = MM.el;

  /* ----------------------------------------------- 48 participants --- */
  // From the attendance confirmation Matthew shared: organisation by organisation.
  var SECTORS = [
    { key: "hotel", label: "Hotels", orgs: [10, 10, 3, 2, 1, 1] },
    { key: "dmc", label: "Destination management companies", short: "DMCs", orgs: [1, 1, 3, 1, 2, 4, 2, 2, 1] },
    { key: "va", label: "Visitor attractions", orgs: [1, 1] },
    { key: "rest", label: "Restaurant", orgs: [2] }
  ];
  MM.SECTORS = SECTORS;

  MM.participants = function (opts) {
    opts = opts || {};
    var f = el("figure", { class: "m m-dots" + (opts.compact ? " m-dots--compact" : "") });
    var total = 0, orgs = 0;
    var html = '<div class="m-dots__grid">';
    SECTORS.forEach(function (s) {
      var n = s.orgs.reduce(function (a, b) { return a + b; }, 0);
      total += n; orgs += s.orgs.length;
      html += '<div class="m-dots__sector is-' + s.key + '"><p><b class="tabular">' + n + "</b> " + (opts.compact && s.short ? s.short : s.label) + "<span>" + s.orgs.length + (s.orgs.length === 1 ? " organisation" : " organisations") + '</span></p><div class="m-dots__orgs">';
      s.orgs.forEach(function (k) {
        var cols = Math.ceil(Math.sqrt(k));
        html += '<span class="m-dots__org" style="--c:' + cols + '" title="' + k + (k === 1 ? " participant" : " participants") + '">' + new Array(k + 1).join("<i></i>") + "</span>";
      });
      html += "</div></div>";
    });
    html += "</div>";
    f.innerHTML = html + '<figcaption><b class="tabular">' + total + " participants</b> from <b class=\"tabular\">" + orgs + " organisations</b>, divided across five groups. Each cluster is one organisation.</figcaption>";
    return f;
  };

  /* ------------------------------------------------------ sprites --- */
  // Sheets are 160px frames (exported at 4x). Walk/move sheets: 3 columns x 4 rows,
  // rows are facing directions; row 0 faces the viewer.
  var SPRITES = {
    hero: { src: "assets/img/game/male-walk.png", cols: 3, rows: 4 },
    heroine: { src: "assets/img/game/female-move.png", cols: 3, rows: 4 },
    enemy: { src: "assets/img/game/enemy-move.png", cols: 3, rows: 4 },
    fighter: { src: "assets/img/game/melee-move.png", cols: 3, rows: 4 },
    boss: { src: "assets/img/game/boss.png", cols: 1, rows: 2, size: 320 },
    potionG: { src: "assets/img/game/potion-green.png", w: 320, h: 320 },
    potionP: { src: "assets/img/game/potion-pink.png", w: 320, h: 320 },
    key: { src: "assets/img/game/key.png", w: 500, h: 320 }
  };
  MM.SPRITES = SPRITES;
  var imgCache = {};
  function img(src) {
    if (!imgCache[src]) { var i = new Image(); i.decoding = "async"; i.src = src; imgCache[src] = i; }
    return imgCache[src];
  }
  MM.spriteImg = img;

  MM.spriteStage = function (opts) {
    opts = opts || {};
    var f = el("figure", { class: "m m-sprites" });
    var stage = el("div", { class: "m-sprites__stage", "data-pausable": "" });
    var c = el("canvas", { role: "img", "aria-label": "Pixel-art characters by Matthew: a hero and a heroine walking, an enemy in a black hat, a sword fighter and a floating boss, with potions and a key" });
    stage.appendChild(c);
    f.appendChild(stage);
    if (!opts.bare) f.appendChild(el("figcaption", null, "Sprite sheets drawn for a university game project, animated live from the original sheets."));
    var ctx = c.getContext("2d");
    var cast = ["enemy", "hero", "boss", "heroine", "fighter"];
    MM.pausable(stage);
    MM.loop(stage, function (t) {
      var box = MM.fitCanvas(c, ctx);
      if (!box) return;
      var w = box.w, h = box.h;
      ctx.clearRect(0, 0, w, h);
      ctx.imageSmoothingEnabled = false;
      // floor line
      ctx.fillStyle = "rgba(11,22,48,.08)";
      ctx.fillRect(0, h * 0.8, w, 1);
      var unit = Math.min(w / 6.2, h * 0.55);
      cast.forEach(function (name, i) {
        var s = SPRITES[name], im = img(s.src);
        if (!im.complete || !im.naturalWidth) return;
        var x = w * (0.12 + i * 0.19), base = h * 0.8;
        if (name === "boss") {
          var fr = Math.floor(t / 420) % 2, sz = 320;
          var bob = Math.sin(t / 380) * unit * 0.05;
          ctx.drawImage(im, 0, fr * sz, sz, sz, x - unit * 0.62, base - unit * 1.3 + bob, unit * 1.24, unit * 1.24);
        } else {
          var frame = [0, 1, 2, 1][Math.floor(t / 150 + i) % 4];
          ctx.drawImage(im, frame * 160, 0, 160, 160, x - unit * 0.5, base - unit, unit, unit);
        }
      });
      // items floating above
      var items = [["potionG", 0.3], ["key", 0.5], ["potionP", 0.7]];
      items.forEach(function (it, i) {
        var s = SPRITES[it[0]], im = img(s.src);
        if (!im.complete || !im.naturalWidth) return;
        var iw = unit * 0.42 * (s.w / s.h), ih = unit * 0.42;
        var y = h * 0.16 + Math.sin(t / 520 + i * 1.7) * unit * 0.06;
        ctx.drawImage(im, w * it[1] - iw / 2, y, iw, ih);
      });
    });
    return f;
  };

  /* --------------------------------------------------------- Malta --- */
  // Rasterise the five regional outlines into a grid and keep the inked cells.
  MM.maltaPoints = function (w, h, opts) {
    opts = opts || {};
    var M = window.MALTA;
    if (!M) return [];
    var stride = opts.stride || 4, pad = opts.pad == null ? 0.08 : opts.pad, jitter = opts.jitter == null ? 0.9 : opts.jitter;
    var rnd = MM.rng(opts.seed || 11);
    var bw = M.bounds[2] - M.bounds[0], bh = M.bounds[3] - M.bounds[1];
    var s = Math.min(w * (1 - pad * 2) / bw, h * (1 - pad * 2) / bh) * (opts.scale || 1);
    var ox = (w - bw * s) / 2 - M.bounds[0] * s + (opts.dx || 0);
    var oy = (h - bh * s) / 2 - M.bounds[1] * s + (opts.dy || 0);
    var cv = document.createElement("canvas");
    cv.width = Math.max(1, Math.ceil(w)); cv.height = Math.max(1, Math.ceil(h));
    var g = cv.getContext("2d");
    g.fillStyle = "#000";
    g.setTransform(s, 0, 0, s, ox, oy);
    M.regions.forEach(function (r) { g.fill(new Path2D(r.d)); });
    var data = g.getImageData(0, 0, cv.width, cv.height).data;
    var pts = [];
    for (var y = 0; y < cv.height; y += stride) {
      for (var x = 0; x < cv.width; x += stride) {
        if (data[4 * ((y | 0) * cv.width + (x | 0)) + 3] > 128) pts.push({ x: x + (rnd() - 0.5) * 2 * jitter, y: y + (rnd() - 0.5) * 2 * jitter });
      }
    }
    return pts;
  };

  MM.drawMaltaDots = function (canvas, opts) {
    opts = opts || {};
    var ctx = canvas.getContext("2d");
    var box = MM.fitCanvas(canvas, ctx);
    if (!box) return false;
    var pts = MM.maltaPoints(box.w, box.h, { stride: opts.stride || 2.2, pad: opts.pad == null ? 0.06 : opts.pad, jitter: 0.35, seed: 5 });
    ctx.clearRect(0, 0, box.w, box.h);
    ctx.fillStyle = opts.color || "#0B1630";
    var r = opts.r || 0.62;
    ctx.beginPath();
    pts.forEach(function (p) { ctx.moveTo(p.x + r, p.y); ctx.arc(p.x, p.y, r, 0, Math.PI * 2); });
    ctx.fill();
    return true;
  };
})();
