const USERS_KEY = "users";
const SESSION_KEY = "currentUser";

function getUsers() {
  try { return JSON.parse(localStorage.getItem(USERS_KEY)) || []; }
  catch (e) { return []; }
}
function setUsers(users) {
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
}
function currentUser() {
  try { return JSON.parse(sessionStorage.getItem(SESSION_KEY)); }
  catch (e) { return null; }
}

function toHex(buf) {
  return Array.from(new Uint8Array(buf)).map(function (b) { return b.toString(16).padStart(2, "0"); }).join("");
}
function fromHex(hex) {
  return new Uint8Array(hex.match(/.{2}/g).map(function (x) { return parseInt(x, 16); }));
}
async function hashPassword(password, saltHex) {
  const salt = saltHex ? fromHex(saltHex) : crypto.getRandomValues(new Uint8Array(16));
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(password), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", salt: salt, iterations: 100000, hash: "SHA-256" }, key, 256);
  return { salt: toHex(salt), hash: toHex(bits) };
}
function cryptoReady() {
  return !!(window.crypto && window.crypto.subtle);
}

if (document.body.hasAttribute("data-protected") && !currentUser()) {
  window.location.replace("login.html");
}
const me = currentUser();
document.querySelectorAll("[data-user-name]").forEach(function (el) {
  el.textContent = me ? me.name : "";
});
document.querySelectorAll("[data-logout]").forEach(function (el) {
  el.addEventListener("click", function (e) {
    e.preventDefault();
    sessionStorage.removeItem(SESSION_KEY);
    window.location.href = "login.html";
  });
});

const showPw = document.getElementById("showPw");
if (showPw) {
  showPw.addEventListener("change", function () {
    document.querySelectorAll("input[data-pw]").forEach(function (i) {
      i.type = showPw.checked ? "text" : "password";
    });
  });
}

const msg = document.getElementById("authMsg");
function show(text, fieldId, ok) {
  msg.textContent = text;
  msg.className = ok ? "msg ok" : "msg";
  msg.hidden = false;
  if (fieldId) document.getElementById(fieldId).focus();
}

const signupForm = document.getElementById("signupForm");
if (signupForm) {
  signupForm.addEventListener("submit", async function (e) {
    e.preventDefault();
    if (!cryptoReady()) return show("This browser cannot protect passwords here. Open the site with Live Server (localhost).", "fullName");

    const name = document.getElementById("fullName").value.trim();
    const email = document.getElementById("email").value.trim().toLowerCase();
    const pw = document.getElementById("password").value;
    const pw2 = document.getElementById("confirm").value;

    if (!name) return show("Please enter your full name.", "fullName");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return show("Please enter a valid email address.", "email");
    if (pw.length < 8) return show("Password must be at least 8 characters.", "password");
    if (pw !== pw2) return show("The two passwords do not match.", "confirm");

    const users = getUsers();
    if (users.some(function (u) { return u.email === email; })) {
      return show("An account with this email already exists. Please log in.", "email");
    }
    const h = await hashPassword(pw);
    users.push({ name: name, email: email, salt: h.salt, hash: h.hash });
    try { setUsers(users); }
    catch (err) { return show("Could not save the account in this browser.", "fullName"); }
    window.location.href = "login.html?registered=1";
  });
}

const loginForm = document.getElementById("loginForm");
if (loginForm) {
  if (new URLSearchParams(window.location.search).get("registered")) {
    show("Account created. Please log in.", null, true);
  }
  loginForm.addEventListener("submit", async function (e) {
    e.preventDefault();
    if (!cryptoReady()) return show("This browser cannot protect passwords here. Open the site with Live Server (localhost).", "email");

    const email = document.getElementById("email").value.trim().toLowerCase();
    const pw = document.getElementById("password").value;
    if (!email || !pw) return show("Please enter your email and password.", "email");

    const bad = "Email or password is incorrect.";
    const user = getUsers().find(function (u) { return u.email === email; });
    if (!user) return show(bad, "password");

    const h = await hashPassword(pw, user.salt);
    if (h.hash !== user.hash) return show(bad, "password");

    sessionStorage.setItem(SESSION_KEY, JSON.stringify({ name: user.name, email: user.email }));
    window.location.href = "index.html";
  });
}
