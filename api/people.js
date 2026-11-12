"use strict";

const crypto = require("node:crypto");
const { put, list, get, del } = require("@vercel/blob");

const PREFIX = "people/";
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const FIELD_LIMITS = { name: 100, email: 200, mark: 2, gender: 10, country: 30, dateofbirth: 10, range: 2, file: 200, properties: 100, message: 1000 };

const sha = (text) => crypto.createHash("sha256").update(text).digest("hex");
const idFor = (email) => sha(email.toLowerCase()).slice(0, 20);
const send = (res, status, body) => {
  res.setHeader("Cache-Control", "no-store");
  res.status(status).json(body);
};
const clean = ({ tokenHash, ...person }) => person;

async function readPerson(id) {
  const blob = await get(PREFIX + id + ".json", { access: "private", useCache: false });
  if (!blob || blob.statusCode !== 200) return null;
  return new Response(blob.stream).json();
}

async function readAll() {
  const people = [];
  let cursor;
  do {
    const page = await list({ prefix: PREFIX, cursor, limit: 500 });
    const found = await Promise.all(page.blobs.map(async (item) => {
      try { return await readPerson(item.pathname.slice(PREFIX.length, -5)); } catch { return null; }
    }));
    people.push(...found.filter(Boolean));
    cursor = page.hasMore ? page.cursor : undefined;
  } while (cursor);
  return people.sort((a, b) => String(a.enrolledAt).localeCompare(String(b.enrolledAt)));
}

function parseBody(req) {
  const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
  return body && typeof body === "object" ? body : null;
}

function validate(input) {
  const person = {};
  for (const [key, max] of Object.entries(FIELD_LIMITS)) {
    const value = input[key] === undefined || input[key] === null ? "" : String(input[key]).trim();
    if (value.length > max) return { error: "The " + key + " is too long." };
    person[key] = value;
  }
  if (!person.name) return { error: "Please enter a name." };
  if (!EMAIL.test(person.email)) return { error: "Please enter a valid email address." };
  if (person.mark !== "" && !(Number(person.mark) >= 1 && Number(person.mark) <= 12)) return { error: "Class must be 1 to 12." };
  person.email = person.email.toLowerCase();
  return { person };
}

module.exports = async (req, res) => {
  try {
    if (req.method === "GET") {
      const id = typeof req.query.id === "string" ? req.query.id.replace(/[^a-f0-9]/g, "") : "";
      if (id) {
        const person = await readPerson(id);
        return person ? send(res, 200, clean(person)) : send(res, 404, { error: "Not found." });
      }
      const people = (await readAll()).map(({ id, name, mark, enrolledAt }) => ({ id, name, mark, enrolledAt }));
      return send(res, 200, { people });
    }

    if (req.method === "POST") {
      const input = parseBody(req);
      const token = input && typeof input.token === "string" ? input.token : "";
      if (!input || token.length < 20 || token.length > 100) return send(res, 400, { error: "Invalid request." });
      const checked = validate(input);
      if (checked.error) return send(res, 400, { error: checked.error });

      const id = idFor(checked.person.email);
      const existing = await readPerson(id).catch(() => null);
      const tokenHash = sha(token);
      if (existing && existing.tokenHash !== tokenHash) {
        return send(res, 200, { id, existing: true }); // already registered by someone else: never overwrite
      }
      const merged = Object.assign({}, existing || {}, {
        id, tokenHash,
        enrolledAt: (existing && existing.enrolledAt) || new Date().toISOString(),
        agreed: "Yes"
      });
      for (const [key, value] of Object.entries(checked.person)) {
        if (value !== "" || !(key in merged)) merged[key] = value; // later form adds details, never blanks them
      }
      await put(PREFIX + id + ".json", JSON.stringify(merged), {
        access: "private", contentType: "application/json", allowOverwrite: true, addRandomSuffix: false
      });
      return send(res, 200, { id });
    }

    if (req.method === "DELETE") {
      const id = typeof req.query.id === "string" ? req.query.id.replace(/[^a-f0-9]/g, "") : "";
      const token = String(req.headers["x-owner-token"] || "");
      const person = id ? await readPerson(id).catch(() => null) : null;
      if (!person) return send(res, 404, { error: "Not found." });
      if (!token || sha(token) !== person.tokenHash) return send(res, 403, { error: "Only the person who registered can delete this entry." });
      await del(PREFIX + id + ".json");
      return send(res, 200, { ok: true });
    }

    res.setHeader("Allow", "GET, POST, DELETE");
    return send(res, 405, { error: "Method not allowed." });
  } catch (error) {
    console.error("people api failed:", error && error.message);
    return send(res, 500, { error: "Something went wrong. Please try again." });
  }
};
