(function () {
  "use strict";
  // The AI buttons next to each book load that book into the study room on this same page.
  document.querySelectorAll("a.cb-btn.ai").forEach(function (button) {
    button.addEventListener("click", function (event) {
      const pdf = new URL(button.href).searchParams.get("file");
      if (!pdf || !window.PorBhaiStudy) return; // falls back to the full Study page
      event.preventDefault();
      window.PorBhaiStudy.openUrl(pdf);
      const room = document.getElementById("ai-study");
      if (room) room.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  });
})();
