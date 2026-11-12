// Makes the Class dropdown work on touch screens and small phones,
// where there is no mouse hover: tap to open the list, tap again to close it.
(function () {
  var touch = window.matchMedia("(hover: none), (max-width: 40rem)");
  var drops = document.querySelectorAll(".navbar .dropdown");
  if (!drops.length) return;

  function closeAll(except) {
    drops.forEach(function (d) {
      if (d === except) return;
      d.classList.remove("open");
      var a = d.querySelector(":scope > a");
      if (a) a.setAttribute("aria-expanded", "false");
    });
  }

  drops.forEach(function (d) {
    var link = d.querySelector(":scope > a");
    if (!link) return;
    link.setAttribute("aria-haspopup", "true");
    link.setAttribute("aria-expanded", "false");
    link.addEventListener("click", function (e) {
      if (!touch.matches) return; // desktop: hover opens it, click goes to the link
      e.preventDefault();
      var open = !d.classList.contains("open");
      closeAll(d);
      d.classList.toggle("open", open);
      link.setAttribute("aria-expanded", open ? "true" : "false");
    });
  });

  document.addEventListener("click", function (e) {
    if (!e.target.closest(".navbar .dropdown")) closeAll();
  });
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape") closeAll();
  });
})();
