(function () {
  var reduce = false;

  /* Navbar shadow on scroll */
  var nav = document.querySelector(".navbar");
  function onScroll() { nav.classList.toggle("scrolled", window.scrollY > 10); }
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  /* Typing effect */
  var target = document.getElementById("typed");
  var phrases = [
    "Every class. One clear place.",
    "Study smarter. Stress less.",
    "Find the right material, fast.",
    "Class 1 to Class 12 — all here."
  ];
  if (target) {
    if (reduce) {
      target.textContent = phrases[0];
    } else {
      var p = 0, i = 0, del = false;
      (function tick() {
        var text = phrases[p];
        target.textContent = text.slice(0, i);
        var wait = del ? 28 : 65;
        if (!del && i === text.length) { del = true; wait = 1600; }
        else if (del && i === 0) { del = false; p = (p + 1) % phrases.length; wait = 350; }
        else { i += del ? -1 : 1; }
        setTimeout(tick, wait);
      })();
    }
  }

  /* Scroll reveal */
  var items = document.querySelectorAll(".reveal");
  if ("IntersectionObserver" in window && !reduce) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); }
      });
    }, { threshold: 0.15 });
    items.forEach(function (el) { io.observe(el); });
  } else {
    items.forEach(function (el) { el.classList.add("in"); });
  }

  /* Count-up numbers */
  var counters = document.querySelectorAll("[data-count]");
  function runCounter(el) {
    var end = Number(el.dataset.count), dur = 1400, start = null;
    if (reduce) { el.textContent = end; return; }
    function step(t) {
      if (start === null) start = t;
      var k = Math.min((t - start) / dur, 1);
      el.textContent = Math.round(end * (1 - Math.pow(1 - k, 3)));
      if (k < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }
  if ("IntersectionObserver" in window) {
    var co = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { runCounter(e.target); co.unobserve(e.target); }
      });
    }, { threshold: 0.6 });
    counters.forEach(function (el) { co.observe(el); });
  } else {
    counters.forEach(runCounter);
  }

  /* Class cards: 3D tilt + moving highlight */
  if (!reduce) {
    document.querySelectorAll(".class-card").forEach(function (card) {
      card.addEventListener("mousemove", function (e) {
        var r = card.getBoundingClientRect();
        var x = (e.clientX - r.left) / r.width, y = (e.clientY - r.top) / r.height;
        card.style.setProperty("--mx", x * 100 + "%");
        card.style.setProperty("--my", y * 100 + "%");
        card.style.transform = "perspective(600px) rotateX(" + (0.5 - y) * 12 + "deg) rotateY(" + (x - 0.5) * 14 + "deg) translateY(-4px)";
      });
      card.addEventListener("mouseleave", function () { card.style.transform = ""; });
    });
  }

  /* Hero photo: parallax tilt following the mouse + scroll drift */
  var stage = document.getElementById("photoStage");
  if (stage) {
    var pimg = stage.querySelector("img");
    stage.addEventListener("mousemove", function (e) {
      var r = stage.getBoundingClientRect();
      var x = (e.clientX - r.left) / r.width - .5, y = (e.clientY - r.top) / r.height - .5;
      pimg.style.transform = "scale(1.12) translate(" + (-x * 26) + "px," + (-y * 18) + "px)";
      stage.style.setProperty("--rx", (-y * 6) + "deg");
      stage.style.setProperty("--ry", (x * 8) + "deg");
    });
    stage.addEventListener("mouseleave", function () { pimg.style.transform = ""; stage.style.setProperty("--rx", "0deg"); stage.style.setProperty("--ry", "0deg"); });
  }

  /* Hero particle network */
  var canvas = document.getElementById("particles");
  if (canvas && !reduce) {
    var ctx = canvas.getContext("2d"), dots = [], w, h, mouse = { x: -999, y: -999 };
    function size() {
      w = canvas.width = canvas.offsetWidth;
      h = canvas.height = canvas.offsetHeight;
      var n = Math.min(70, Math.round(w * h / 18000));
      dots = [];
      for (var k = 0; k < n; k++) dots.push({ x: Math.random() * w, y: Math.random() * h, vx: (Math.random() - .5) * .5, vy: (Math.random() - .5) * .5 });
    }
    size();
    window.addEventListener("resize", size);
    canvas.parentNode.addEventListener("mousemove", function (e) {
      var r = canvas.getBoundingClientRect();
      mouse.x = e.clientX - r.left; mouse.y = e.clientY - r.top;
    });
    (function frame() {
      ctx.clearRect(0, 0, w, h);
      for (var a = 0; a < dots.length; a++) {
        var d = dots[a];
        d.x += d.vx; d.y += d.vy;
        if (d.x < 0 || d.x > w) d.vx *= -1;
        if (d.y < 0 || d.y > h) d.vy *= -1;
        ctx.fillStyle = "rgba(255,255,255,.7)";
        ctx.beginPath(); ctx.arc(d.x, d.y, 1.8, 0, 6.283); ctx.fill();
        for (var b = a + 1; b < dots.length; b++) {
          var o = dots[b], dx = d.x - o.x, dy = d.y - o.y, dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 120) {
            ctx.strokeStyle = "rgba(255,255,255," + (0.18 * (1 - dist / 120)) + ")";
            ctx.beginPath(); ctx.moveTo(d.x, d.y); ctx.lineTo(o.x, o.y); ctx.stroke();
          }
        }
        var mx = d.x - mouse.x, my = d.y - mouse.y, md = Math.sqrt(mx * mx + my * my);
        if (md < 140) {
          ctx.strokeStyle = "rgba(252,211,77," + (0.5 * (1 - md / 140)) + ")";
          ctx.beginPath(); ctx.moveTo(d.x, d.y); ctx.lineTo(mouse.x, mouse.y); ctx.stroke();
        }
      }
      requestAnimationFrame(frame);
    })();
  }
})();
