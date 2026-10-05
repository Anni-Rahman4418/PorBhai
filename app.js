const KEY = "registrations";

function loadAll() {
  try { return JSON.parse(localStorage.getItem(KEY)) || []; }
  catch (e) { return []; }
}
function saveAll(list) {
  localStorage.setItem(KEY, JSON.stringify(list));
}

const FIELDS = [
  ["name", "Name"], ["email", "Email"], ["mark", "Highest Mark"],
  ["gender", "Gender"], ["country", "Country"], ["date", "Date"],
  ["time", "Time"], ["datetimeLocal", "Date and Time"], ["month", "Joining Month"],
  ["dateofbirth", "Date of Birth"], ["color", "Color"], ["range", "Range"],
  ["file", "Uploaded File"], ["properties", "Properties"],
  ["message", "Message"], ["agreed", "Agreed to Terms"]
];

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
    if (mark !== "" && Number(mark) < 0) return fail("Highest mark cannot be negative.", "mark");
    if (!d.get("subscribe")) return fail("Please agree to the terms and conditions.", "subscribe");

    const file = document.getElementById("file").files[0];
    const person = {
      id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      name: name,
      email: email,
      mark: mark,
      gender: d.get("gender") || "",
      country: d.get("country"),
      date: d.get("date"),
      time: d.get("time"),
      datetimeLocal: d.get("datetime-local"),
      month: d.get("month"),
      dateofbirth: d.get("dateofbirth"),
      color: d.get("color"),
      range: d.get("Range"),
      file: file ? file.name : "",
      properties: ["Laptop", "Mobile", "Tablet"].filter(function (p) { return d.get(p); }).join(", "),
      message: d.get("message").trim(),
      agreed: "Yes"
    };

    const all = loadAll();
    all.push(person);
    try { saveAll(all); } catch (err) { return fail("Could not save in this browser.", "name"); }
    window.location.href = "list.html";
  });
}

const listBody = document.getElementById("peopleBody");
if (listBody) {
  function renderList() {
    const all = loadAll();
    listBody.innerHTML = "";
    document.getElementById("emptyMsg").hidden = all.length > 0;
    document.getElementById("peopleTable").hidden = all.length === 0;

    all.forEach(function (p, i) {
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
          renderList();
        }
      });

      act.append(link, del);
      tr.append(num, nm, act);
      listBody.appendChild(tr);
    });
  }
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
      td.textContent = person[f[0]] || "\u2014";
      tr.append(th, td);
      detailsBody.appendChild(tr);
    });
  }
}
