(function () {
  "use strict";
  const TOKEN_KEY = "ownerToken";
  const MINE_KEY = "myPeopleIds";

  function ownerToken() {
    try {
      let token = localStorage.getItem(TOKEN_KEY);
      if (!token) {
        token = Array.from(crypto.getRandomValues(new Uint8Array(24)), function (b) {
          return b.toString(16).padStart(2, "0");
        }).join("");
        localStorage.setItem(TOKEN_KEY, token);
      }
      return token;
    } catch (e) { return null; }
  }
  function myIds() {
    try { return JSON.parse(localStorage.getItem(MINE_KEY)) || []; } catch (e) { return []; }
  }
  function rememberMine(id) {
    try {
      const ids = myIds();
      if (ids.indexOf(id) < 0) localStorage.setItem(MINE_KEY, JSON.stringify(ids.concat(id)));
    } catch (e) { /* ignore */ }
  }
  async function call(url, options) {
    const response = await fetch(url, options);
    let data = {};
    try { data = await response.json(); } catch (e) { /* ignore */ }
    if (!response.ok) throw new Error(data.error || "Something went wrong. Please try again.");
    return data;
  }

  window.PorBhaiPeople = {
    isMine: function (id) { return myIds().indexOf(id) >= 0; },
    list: function () { return call("/api/people"); },
    get: function (id) { return call("/api/people?id=" + encodeURIComponent(id)); },
    // Adds the person to the shared People list. Never send a password here.
    register: async function (person) {
      const token = ownerToken();
      if (!token) throw new Error("This browser cannot save your registration.");
      const result = await call("/api/people", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(Object.assign({}, person, { token: token }))
      });
      if (!result.existing) rememberMine(result.id);
      return result;
    },
    remove: function (id) {
      return call("/api/people?id=" + encodeURIComponent(id), {
        method: "DELETE", headers: { "X-Owner-Token": ownerToken() || "" }
      });
    }
  };
})();
