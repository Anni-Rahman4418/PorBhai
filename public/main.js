const FIELDS = [
  ["name", "Name"], ["email", "Email"], ["mark", "Class"],
  ["gender", "Gender"], ["country", "Country"], ["dateofbirth", "Date of Birth"],
  ["range", "Skills Rating (0-12)"], ["file", "Picture (file name)"],
  ["properties", "Properties"], ["message", "Message"],
  ["enrolledAt", "Enrolled On"], ["agreed", "Agreed to Terms"]
];

function enrolledDate(p) {
  if (p.enrolledAt) {
    const d = new Date(p.enrolledAt);
    if (!isNaN(d)) return d;
  }
  return null;
}
function monthKeyOf(p) {
  const d = enrolledDate(p);
  return d ? d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") : "unknown";
}
function monthLabel(key) {
  if (key === "unknown") return "Unknown date";
  const parts = key.split("-");
  return new Date(Number(parts[0]), Number(parts[1]) - 1, 1)
    .toLocaleString("en", { month: "long", year: "numeric" });
}
function dayLabel(d) {
  return d ? d.toLocaleDateString("en", { day: "numeric", month: "short", year: "numeric" }) : "—";
}

const form = document.getElementById("regForm");
if (form) {
  const msg = document.getElementById("formMsg");
  const submitButton = form.querySelector('input[type="submit"]');

  function fail(text, fieldId) {
    msg.textContent = text;
    msg.hidden = false;
    document.getElementById(fieldId).focus();
  }

  form.addEventListener("submit", async function (e) {
    e.preventDefault();
    const d = new FormData(form);
    const name = d.get("name").trim();
    const email = d.get("email").trim();
    const password = d.get("password");
    const mark = d.get("mark");

    if (!name) return fail("Please enter your name.", "name");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return fail("Please enter a valid email address.", "email");
    if (password.length < 6) return fail("Password must be at least 6 characters.", "password");
    if (mark !== "" && (Number(mark) < 1 || Number(mark) > 12)) return fail("Class must be a number from 1 to 12.", "mark");
    if (!d.get("subscribe")) return fail("Please agree to the terms and conditions.", "subscribe");

    const file = document.getElementById("file").files[0];
    // The password is intentionally NOT sent or stored anywhere.
    const person = {
      name: name,
      email: email,
      mark: mark,
      gender: d.get("gender") || "",
      country: d.get("country"),
      dateofbirth: d.get("dateofbirth"),
      range: d.get("Range"),
      file: file ? file.name : "",
      properties: ["Laptop", "Mobile", "Tablet", "Desktop"].filter(function (p) { return d.get(p); }).join(", "),
      message: d.get("message").trim()
    };

    submitButton.disabled = true;
    msg.hidden = true;
    try {
      await window.PorBhaiPeople.register(person);
      window.location.href = "list.html";
    } catch (err) {
      submitButton.disabled = false;
      fail(err.message || "Could not save your registration. Please try again.", "name");
    }
  });
}

const listBody = document.getElementById("peopleBody");
if (listBody) {
  const searchBox = document.getElementById("searchBox");
  const monthSel = document.getElementById("monthFilter");
  const countEl = document.getElementById("resultCount");
  const noMatch = document.getElementById("noMatch");
  const emptyMsg = document.getElementById("emptyMsg");
  const hasDateColumn = document.querySelectorAll("#peopleTable thead th").length >= 4;
  let people = [];

  function fillMonths() {
    if (!monthSel) return;
    const keys = Array.from(new Set(people.map(monthKeyOf))).sort().reverse();
    const keep = monthSel.value;
    monthSel.innerHTML = "";
    const first = document.createElement("option");
    first.value = "all"; first.textContent = "All months";
    monthSel.appendChild(first);
    keys.forEach(function (k) {
      const o = document.createElement("option");
      o.value = k; o.textContent = monthLabel(k);
      monthSel.appendChild(o);
    });
    monthSel.value = keys.indexOf(keep) >= 0 ? keep : "all";
  }

  function renderList() {
    const q = searchBox ? searchBox.value.trim().toLowerCase() : "";
    const m = monthSel ? monthSel.value : "all";

    const shown = people.filter(function (p) {
      const okMonth = m === "all" || monthKeyOf(p) === m;
      const okText = !q || String(p.name).toLowerCase().indexOf(q) >= 0;
      return okMonth && okText;
    });

    listBody.innerHTML = "";
    emptyMsg.hidden = people.length > 0;
    document.getElementById("peopleTable").hidden = shown.length === 0;
    if (noMatch) noMatch.hidden = !(people.length > 0 && shown.length === 0);
    if (countEl) countEl.textContent = people.length ? shown.length + " of " + people.length + " people" : "";

    shown.forEach(function (p, i) {
      const tr = document.createElement("tr");

      const num = document.createElement("td");
      num.textContent = i + 1;

      const nm = document.createElement("td");
      nm.textContent = p.name;

      const act = document.createElement("td");
      const link = document.createElement("a");
      link.className = "btn-link";
      link.href = "details.html?id=" + encodeURIComponent(p.id);
      link.textContent = "Information";
      act.appendChild(link);

      // Only the person who registered (on this browser) can delete their own entry.
      if (window.PorBhaiPeople.isMine(p.id)) {
        const del = document.createElement("button");
        del.type = "button";
        del.className = "btn-del";
        del.textContent = "Delete";
        del.addEventListener("click", async function () {
          if (!confirm("Delete " + p.name + "?")) return;
          del.disabled = true;
          try {
            await window.PorBhaiPeople.remove(p.id);
            people = people.filter(function (x) { return x.id !== p.id; });
            fillMonths();
            renderList();
          } catch (err) {
            del.disabled = false;
            alert(err.message);
          }
        });
        act.appendChild(del);
      }

      tr.append(num, nm);
      if (hasDateColumn) {
        const when = document.createElement("td");
        when.textContent = dayLabel(enrolledDate(p));
        tr.appendChild(when);
      }
      tr.appendChild(act);
      listBody.appendChild(tr);
    });
  }

  // Pressing Enter / Search with a name that nobody has enrolled under opens a themed popup.
  const searchForm = document.getElementById("searchForm");
  const modal = document.getElementById("notFoundModal");
  if (searchForm && modal) {
    const nfText = document.getElementById("nfText");
    const closeBtn = document.getElementById("nfClose");
    function closeModal() {
      modal.hidden = true;
      searchBox.focus();
      searchBox.select();
    }
    searchForm.addEventListener("submit", function (e) {
      e.preventDefault();
      const q = searchBox.value.trim().toLowerCase();
      if (!q) return;
      const found = people.some(function (p) { return String(p.name).toLowerCase().indexOf(q) >= 0; });
      if (!found) {
        nfText.textContent = "“" + searchBox.value.trim() + "” is not enrolled in PorBhai yet.";
        modal.hidden = false;
        closeBtn.focus();
      }
    });
    closeBtn.addEventListener("click", closeModal);
    modal.addEventListener("click", function (e) { if (e.target === modal) closeModal(); });
    document.addEventListener("keydown", function (e) { if (e.key === "Escape" && !modal.hidden) closeModal(); });
  }

  if (searchBox) searchBox.addEventListener("input", renderList);
  if (monthSel) monthSel.addEventListener("change", renderList);
  emptyMsg.hidden = true;
  window.PorBhaiPeople.list().then(function (result) {
    people = result.people || [];
    fillMonths();
    renderList();
  }).catch(function (err) {
    emptyMsg.textContent = err.message || "Could not load the list. Please reload the page.";
    emptyMsg.hidden = false;
  });
}

const detailsBody = document.getElementById("detailsBody");
if (detailsBody) {
  const id = new URLSearchParams(window.location.search).get("id");
  const showNotFound = function () {
    document.getElementById("detailsTable").hidden = true;
    document.getElementById("notFound").hidden = false;
  };

  if (!id) {
    showNotFound();
  } else {
    window.PorBhaiPeople.get(id).then(function (person) {
      document.getElementById("who").textContent = person.name;
      FIELDS.forEach(function (f) {
        const tr = document.createElement("tr");
        const th = document.createElement("th");
        th.scope = "row";
        th.textContent = f[1];
        const td = document.createElement("td");
        td.textContent = f[0] === "enrolledAt" ? dayLabel(enrolledDate(person)) : (person[f[0]] || "—");
        tr.append(th, td);
        detailsBody.appendChild(tr);
      });
    }).catch(showNotFound);
  }
}
