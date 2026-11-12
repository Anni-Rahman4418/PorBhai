const KEY = "registrations";

function loadAll() {
  try { return JSON.parse(localStorage.getItem(KEY)) || []; }
  catch (e) { return []; }
}
function saveAll(list) {
  localStorage.setItem(KEY, JSON.stringify(list));
}

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
  const t = parseInt(String(p.id).slice(0, -4), 36);
  return isNaN(t) ? null : new Date(t);
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
  return d ? d.toLocaleDateString("en", { day: "numeric", month: "short", year: "numeric" }) : "\u2014";
}

const form = document.getElementById("regForm");
if (form) {
  const msg = document.getElementById("formMsg");

  function fail(text, fieldId) {
    msg.textContent = text;
    msg.hidden = false;
    document.getElementById(fieldId).focus();
  }

  form.addEventListener("submit", function (e) {
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
    const person = {
      id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      name: name,
      email: email,
      mark: mark,
      gender: d.get("gender") || "",
      country: d.get("country"),
      dateofbirth: d.get("dateofbirth"),
      range: d.get("Range"),
      file: file ? file.name : "",
      properties: ["Laptop", "Mobile", "Tablet", "Desktop"].filter(function (p) { return d.get(p); }).join(", "),
      message: d.get("message").trim(),
      agreed: "Yes",
      enrolledAt: new Date().toISOString(),
      agreed:"Yes"
    };

    const all = loadAll();
    all.push(person);
    try { saveAll(all); } catch (err) { return fail("Could not save in this browser.", "name"); }
    window.location.href = "list.html";
  });
}

const listBody = document.getElementById("peopleBody");
if (listBody) {
  const searchBox = document.getElementById("searchBox");    
  const monthSel = document.getElementById("monthFilter");
  const countEl = document.getElementById("resultCount");
  const noMatch = document.getElementById("noMatch");
  const hasDateColumn = document.querySelectorAll("#peopleTable thead th").length >= 4;
  function fillMonths() {
    if (!monthSel) return;
    const keys = Array.from(new Set(loadAll().map(monthKeyOf))).sort().reverse();
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
    const all = loadAll();
    const q = searchBox ? searchBox.value.trim().toLowerCase() : "";
    const m = monthSel ? monthSel.value : "all";

    const shown = all.filter(function (p) {
      const okMonth = m === "all" || monthKeyOf(p) === m;
      const okText = !q || (p.name + " " + p.email).toLowerCase().indexOf(q) >= 0;
      return okMonth && okText;
    });

    listBody.innerHTML = "";
    document.getElementById("emptyMsg").hidden = all.length > 0;
    document.getElementById("peopleTable").hidden = shown.length === 0;
    if (noMatch) noMatch.hidden = !(all.length > 0 && shown.length === 0);
    if (countEl) countEl.textContent = all.length ? shown.length + " of " + all.length + " people" : "";

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

      const del = document.createElement("button");
      del.type = "button";
      del.className = "btn-del";
      del.textContent = "Delete";
      del.addEventListener("click", function () {
        if (confirm("Delete " + p.name + "?")) {
          saveAll(loadAll().filter(function (x) { return x.id !== p.id; }));
          fillMonths();
          renderList();
        }
      });
      act.append(link, del);

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

  if (searchBox) searchBox.addEventListener("input", renderList);
  if (monthSel) monthSel.addEventListener("change", renderList);
  fillMonths();
  renderList();
}

const detailsBody = document.getElementById("detailsBody");
if (detailsBody) {
  const id = new URLSearchParams(window.location.search).get("id");
  const person = loadAll().find(function (x) { return x.id === id; });

  if (!person) {
    document.getElementById("detailsTable").hidden = true;
    document.getElementById("notFound").hidden = false;
  } else {
    document.getElementById("who").textContent = person.name;
    FIELDS.forEach(function (f) {
      const tr = document.createElement("tr");
      const th = document.createElement("th");
      th.scope = "row";
      th.textContent = f[1];
      const td = document.createElement("td");
      td.textContent = f[0] === "enrolledAt" ? dayLabel(enrolledDate(person)) : (person[f[0]] || "\u2014");
      tr.append(th, td);
      detailsBody.appendChild(tr);
    });
  }
}
