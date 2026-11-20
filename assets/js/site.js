(function () {
  var D = window.HUAQUN;
  var IMG = "assets/img/";

  function cat(id) {
    for (var i = 0; i < D.cats.length; i++) if (D.cats[i].id === id) return D.cats[i];
    return { name: id, short: id };
  }
  function caseById(id) {
    for (var i = 0; i < D.cases.length; i++) if (D.cases[i].id === id) return D.cases[i];
    return null;
  }
  function visible() {
    return D.cases.filter(function (c) { return !c.hide; });
  }
  function pic(key, kind, alt, lazy) {
    var b = IMG + kind + "/" + key;
    return '<picture><source type="image/webp" srcset="' + b + '.webp">' +
      '<img src="' + b + '.jpg" alt="' + esc(alt) + '"' +
      (lazy ? ' loading="lazy"' : "") + '></picture>';
  }
  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"]/g, function (m) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[m];
    });
  }
  function qs(name) {
    var m = new RegExp("[?&]" + name + "=([^&]*)").exec(location.search);
    return m ? decodeURIComponent(m[1].replace(/\+/g, " ")) : "";
  }
  function metaLine(c) {
    var bits = [];
    bits.push("<span><b>类型：</b>" + esc(cat(c.cat).short) + "</span>");
    bits.push("<span><b>区域：</b>" + esc(c.region) + "</span>");
    bits.push("<span><b>年份：</b>" + (c.year || "近年") + "</span>");
    return bits.join("");
  }
  function card(c) {
    return '<a class="card" href="case.html?id=' + encodeURIComponent(c.id) + '">' +
      '<div class="ph"><span class="tag">' + esc(cat(c.cat).short) + "</span>" +
      pic(c.cover, "thumb", c.title, true) +
      '<span class="cnt">' + c.images.length + " 图</span></div>" +
      '<div class="bd"><h4>' + esc(c.title) + "</h4>" +
      '<div class="meta">' + metaLine(c) + "</div></div></a>";
  }

  /* ---------------- 首页 ---------------- */
  function home() {
    var heroes = D.cases.filter(function (c) { return c.hero; })
      .sort(function (a, b) { return (a.heroRank || 99) - (b.heroRank || 99); });
    var slides = "", dots = "";
    heroes.forEach(function (c, i) {
      slides += '<div class="hero-slide' + (i === 0 ? " on" : "") +
        '" style="background-image:url(' + IMG + "hero/" + c.hero + '.webp),url(' + IMG + "hero/" + c.hero + '.jpg)"></div>';
      dots += "<button" + (i === 0 ? ' class="on"' : "") + " data-i=\"" + i + '"></button>';
    });
    document.getElementById("slides").innerHTML = slides;
    document.getElementById("dots").innerHTML = dots;

    var cur = 0, timer;
    var count = document.getElementById("hcount");
    function pad(n) { return (n < 10 ? "0" : "") + n; }
    function go(i) {
      var s = document.querySelectorAll(".hero-slide"), d = document.querySelectorAll(".hero-dots button");
      if (!s.length) return;
      cur = (i + s.length) % s.length;
      for (var k = 0; k < s.length; k++) { s[k].classList.toggle("on", k === cur); d[k].classList.toggle("on", k === cur); }
      if (count) count.textContent = pad(cur + 1) + " / " + pad(s.length);
    }
    function play() { clearInterval(timer); timer = setInterval(function () { go(cur + 1); }, 5200); }
    document.getElementById("dots").addEventListener("click", function (e) {
      if (e.target.dataset.i != null) { go(+e.target.dataset.i); play(); }
    });
    var prev = document.getElementById("hprev"), next = document.getElementById("hnext");
    if (prev) prev.onclick = function () { go(cur - 1); play(); };
    if (next) next.onclick = function () { go(cur + 1); play(); };
    var hero = document.querySelector(".hero");
    if (hero) {
      hero.onmouseenter = function () { clearInterval(timer); };
      hero.onmouseleave = play;
    }
    go(0);
    play();

    document.getElementById("cats").innerHTML = D.cats.map(function (k) {
      var list = visible().filter(function (c) { return c.cat === k.id; });
      if (!list.length) return "";
      var n = list.reduce(function (a, c) { return a + c.images.length; }, 0);
      return '<a class="cat-card" href="cases.html?cat=' + k.id + '">' +
        '<div class="ph"><span class="n">' + list.length + " 个项目</span>" +
        pic(list[0].cover, "thumb", k.name, true) + "</div>" +
        '<div class="bd"><h4>' + esc(k.name) + "</h4><p>" + esc(k.desc) + "</p></div></a>";
    }).join("");

    var picked = visible().filter(function (c) { return c.kind === "named"; })
      .sort(function (a, b) { return (b.year || 0) - (a.year || 0); }).slice(0, 6);
    document.getElementById("picked").innerHTML = picked.map(card).join("");

    var named = visible().filter(function (c) { return c.kind === "named"; }).length;
    var total = visible().reduce(function (a, c) { return a + c.images.length; }, 0);
    var regions = {};
    visible().forEach(function (c) { regions[c.region] = 1; });
    document.getElementById("stats").innerHTML = [
      [D.company.founded, "年", "公司注册成立"],
      [named, "个", "画册署名工程"],
      [total, "张", "工程影像"],
      [Object.keys(regions).length, "地", "服务区域"],
    ].map(function (r) { return "<div><b>" + r[0] + "<i>" + r[1] + "</i></b><span>" + r[2] + "</span></div>"; }).join("");
  }

  /* ---------------- 案例列表 ---------------- */
  function cases() {
    var box = document.getElementById("filters");
    var state = { cat: qs("cat") || "all", region: qs("region") || "all", year: qs("year") || "all", kind: qs("kind") || "all", page: +qs("page") || 1 };

    var cats = ["all"].concat(D.cats.filter(function (k) {
      return visible().some(function (c) { return c.cat === k.id; });
    }).map(function (k) { return k.id; }));
    var regions = ["all"];
    visible().forEach(function (c) { if (regions.indexOf(c.region) < 0) regions.push(c.region); });
    var years = ["all"];
    visible().forEach(function (c) { var y = c.year || "近年"; if (years.indexOf(y) < 0) years.push(y); });
    years.sort(function (a, b) { return (b === "近年" ? 0 : +b) - (a === "近年" ? 0 : +a); });

    function row(label, key, opts, fmt) {
      return '<div class="f-row"><div class="lb">' + label + '</div><div class="op">' +
        opts.map(function (v) {
          return '<a href="#" data-k="' + key + '" data-v="' + encodeURIComponent(v) + '"' +
            (state[key] === v ? ' class="on"' : "") + ">" + esc(fmt ? fmt(v) : v) + "</a>";
        }).join("") + "</div></div>";
    }
    box.innerHTML = [
      row("业务类型", "cat", cats, function (v) { return v === "all" ? "全部" : cat(v).short; }),
      row("项目区域", "region", regions, function (v) { return v === "all" ? "全部" : v; }),
      row("交付年份", "year", years, function (v) { return v === "all" ? "全部" : v; }),
      row("资料性质", "kind", ["all", "named", "site"], function (v) {
        return { all: "全部", named: "画册署名项目", site: "工地实拍图集" }[v];
      }),
    ].join("");

    function filtered() {
      return visible().filter(function (c) {
        if (state.cat !== "all" && c.cat !== state.cat) return false;
        if (state.region !== "all" && c.region !== state.region) return false;
        if (state.year !== "all" && String(c.year || "近年") !== state.year) return false;
        if (state.kind !== "all" && c.kind !== state.kind) return false;
        return true;
      }).sort(function (a, b) {
        if (a.kind !== b.kind) return a.kind === "named" ? -1 : 1;
        return (b.year || 0) - (a.year || 0);
      });
    }

    var PER = 9;
    function render() {
      var list = filtered();
      var pages = Math.max(1, Math.ceil(list.length / PER));
      if (state.page > pages) state.page = 1;
      var slice = list.slice((state.page - 1) * PER, state.page * PER);
      document.getElementById("count").innerHTML =
        "共 <b>" + list.length + "</b> 个项目" + (list.length ? " · " + list.reduce(function (a, c) { return a + c.images.length; }, 0) + " 张图" : "");
      document.getElementById("grid").innerHTML = slice.length
        ? '<div class="grid">' + slice.map(card).join("") + "</div>"
        : '<div class="empty"><b>没有匹配的项目</b>当前筛选条件下暂无案例，可放宽条件，或把新照片交给我补充进来。</div>';

      var p = "";
      p += "<button data-p=\"" + (state.page - 1) + '"' + (state.page === 1 ? " disabled" : "") + ">上一页</button>";
      for (var i = 1; i <= pages; i++) {
        if (pages > 7 && i > 2 && i < pages - 1 && Math.abs(i - state.page) > 1) {
          if (!p.endsWith("…</button>")) p += "<button disabled>…</button>";
          continue;
        }
        p += "<button data-p=\"" + i + '"' + (i === state.page ? ' class="on"' : "") + ">" + i + "</button>";
      }
      p += "<button data-p=\"" + (state.page + 1) + '"' + (state.page === pages ? " disabled" : "") + ">下一页</button>";
      document.getElementById("pager").innerHTML = pages > 1 ? p : "";
    }

    box.addEventListener("click", function (e) {
      var a = e.target.closest("a[data-k]");
      if (!a) return;
      e.preventDefault();
      state[a.dataset.k] = decodeURIComponent(a.dataset.v);
      state.page = 1;
      apply();
    });
    document.getElementById("pager").addEventListener("click", function (e) {
      var b = e.target.closest("button[data-p]");
      if (!b || b.disabled) return;
      state.page = +b.dataset.p;
      apply();
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
    document.getElementById("reset").addEventListener("click", function () {
      state = { cat: "all", region: "all", year: "all", kind: "all", page: 1 };
      apply();
    });

    function apply() {
      var q = [];
      ["cat", "region", "year", "kind"].forEach(function (k) {
        if (state[k] !== "all") q.push(k + "=" + encodeURIComponent(state[k]));
      });
      if (state.page > 1) q.push("page=" + state.page);
      var url = location.pathname + (q.length ? "?" + q.join("&") : "");
      if (history.replaceState) history.replaceState(null, "", url);
      else location.search = q.length ? "?" + q.join("&") : "";
      box.querySelectorAll("a[data-k]").forEach(function (a) {
        a.classList.toggle("on", a.dataset.v === encodeURIComponent(state[a.dataset.k]) || decodeURIComponent(a.dataset.v) === state[a.dataset.k]);
      });
      render();
    }
    render();
  }

  /* ---------------- 案例详情 ---------------- */
  function detail() {
    var c = caseById(qs("id")) || visible()[0];
    if (!c) return;
    document.title = c.title + " - " + D.company.name;
    var k = cat(c.cat);
    document.getElementById("crumb").innerHTML =
      '<a href="index.html">首页</a> &gt; <a href="cases.html">工程案例</a> &gt; <a href="cases.html?cat=' + k.id + '">' + esc(k.name) + "</a> &gt; " + esc(c.title);
    document.getElementById("title").innerHTML =
      "<h1>" + esc(c.title) + '</h1><div class="tags"><i>' + esc(k.short) + "</i><i>" + esc(c.region) + "</i>" +
      (c.year ? "<i>" + c.year + " 年交付</i>" : "") + (c.kind === "site" ? "<i>工地实拍</i>" : "<i>画册项目</i>") + "</div>";
    document.getElementById("summary").innerHTML =
      "<p>" + esc(c.summary) + "</p><h3>工程内容</h3><ul class='scope-list'>" +
      c.scope.map(function (s) { return "<li>" + esc(s) + "</li>"; }).join("") + "</ul>" +
      "<h3>工艺与验收要点</h3><p>" + esc(k.desc) + "。本项目图集按施工与交付状态记录，可用于同类工程的方案沟通与报价参考。</p>";
    document.getElementById("info").innerHTML = [
      ["业务类型", k.name], ["项目区域", c.region], ["交付年份", c.year || "近年"],
      ["委托方", c.client || "—"], ["图集数量", c.images.length + " 张"], ["资料性质", c.kind === "named" ? "公司画册署名项目" : "工地实拍图集"],
    ].map(function (r) { return "<li><span>" + r[0] + "</span><em>" + esc(r[1]) + "</em></li>"; }).join("");

    var stage = document.getElementById("stage"), idx = 0;
    function show(i) {
      idx = (i + c.images.length) % c.images.length;
      var im = c.images[idx];
      stage.innerHTML = pic(im.k, "full", im.cap || c.title, false) +
        '<div class="cap">' + esc(im.cap || "") + "（" + (idx + 1) + "/" + c.images.length + "）</div>" +
        '<button class="nav prev" data-d="-1">‹</button><button class="nav next" data-d="1">›</button>';
      stage.dataset.w = im.w; stage.dataset.h = im.h;
      document.querySelectorAll(".thumbs button").forEach(function (b, n) { b.classList.toggle("on", n === idx); });
    }
    document.getElementById("thumbs").innerHTML = c.images.map(function (im, n) {
      return "<button data-n=\"" + n + '">' + pic(im.k, "thumb", im.cap || "", true) + "</button>";
    }).join("");
    document.getElementById("thumbs").addEventListener("click", function (e) {
      var b = e.target.closest("button[data-n]"); if (b) show(+b.dataset.n);
    });
    stage.addEventListener("click", function (e) {
      var b = e.target.closest(".nav");
      if (b) { show(idx + (+b.dataset.d)); return; }
      openLb(c.images[idx], c.title);
    });
    document.addEventListener("keydown", function (e) {
      if (document.getElementById("lb").classList.contains("on")) {
        if (e.key === "Escape") closeLb();
        if (e.key === "ArrowLeft") show(idx - 1);
        if (e.key === "ArrowRight") show(idx + 1);
        return;
      }
      if (e.key === "ArrowLeft") show(idx - 1);
      if (e.key === "ArrowRight") show(idx + 1);
    });
    show(0);

    var rel = visible().filter(function (x) { return x.cat === c.cat && x.id !== c.id; }).slice(0, 3);
    if (rel.length < 3) {
      visible().forEach(function (x) {
        if (rel.length < 3 && x.id !== c.id && rel.indexOf(x) < 0) rel.push(x);
      });
    }
    document.getElementById("related").innerHTML = rel.map(card).join("");
  }

  var lb;
  function openLb(im, title) {
    lb = document.getElementById("lb");
    lb.innerHTML = '<button class="x">×</button>' +
      '<img src="' + IMG + "full/" + im.k + '.jpg" alt="' + esc(title) + '">' +
      '<div class="cap">' + esc(im.cap || title) + "</div>";
    lb.classList.add("on");
    document.body.style.overflow = "hidden";
    lb.querySelector(".x").onclick = closeLb;
    lb.onclick = function (e) { if (e.target === lb) closeLb(); };
  }
  function closeLb() { if (lb) { lb.classList.remove("on"); document.body.style.overflow = ""; } }

  /* ---------------- 公共 ---------------- */
  function shell() {
    var d = new Date();
    document.getElementById("year").textContent = d.getFullYear();
    document.getElementById("cname").textContent = D.company.name;
    document.querySelectorAll("[data-fill-tel]").forEach(function (n) { n.textContent = D.company.phone; });
    var b = document.getElementById("burger");
    if (b) b.onclick = function () { document.getElementById("nav").classList.toggle("open"); };
    var p = location.pathname.split("/").pop() || "index.html";
    var hereCat = qs("cat"), hash = location.hash;
    document.querySelectorAll(".hq-nav a").forEach(function (a) {
      var href = a.getAttribute("href");
      var base = href.split(/[?#]/)[0];
      var linkCat = (/[?&]cat=([^&]*)/.exec(href) || [])[1] || "";
      var linkHash = href.split("#")[1] || "";
      var on;
      if (p === "case.html") on = base === "cases.html" && !linkCat;
      else if (base !== p) on = false;
      else if (linkCat) on = linkCat === hereCat;
      else if (linkHash) on = hash === "#" + linkHash;
      else on = !hereCat && !hash;
      a.classList.toggle("on", !!on);
    });
  }

  window.HQ = { card: card, cat: cat, pic: pic, esc: esc };

  document.addEventListener("DOMContentLoaded", function () {
    shell();
    var p = location.pathname.split("/").pop() || "index.html";
    if (document.getElementById("slides")) home();
    if (document.getElementById("filters")) cases();
    if (document.getElementById("stage")) detail();
  });
})();
