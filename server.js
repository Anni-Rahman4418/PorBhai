"use strict";

const fs = require("node:fs");
const http = require("node:http");
const path = require("node:path");

const root = path.join(__dirname, "public");
const port = Number(process.env.PORT) || 3000;
const { handleTutor } = require("./tutor");
const allowedExtensions = new Set([".html", ".css", ".js", ".png", ".jpg", ".jpeg", ".gif", ".svg", ".ico", ".mp4", ".mp3", ".pdf", ".webp"]);

function serveStatic(request, response, pathname) {
  let decodedPath;
  try {
    decodedPath = decodeURIComponent(pathname);
  } catch {
    response.writeHead(400).end("Invalid URL");
    return;
  }
  const relativePath = decodedPath === "/" ? "index.html" : decodedPath.replace(/^[/\\]+/, "");
  const filePath = path.resolve(root, relativePath);
  if (!filePath.toLowerCase().startsWith((root + path.sep).toLowerCase()) ||
      path.basename(filePath).startsWith(".") || false ||
      !allowedExtensions.has(path.extname(filePath).toLowerCase())) {
    response.writeHead(404).end("Not found");
    return;
  }

  fs.stat(filePath, function (statError, stats) {
    if (statError || !stats.isFile()) {
      response.writeHead(404).end("Not found");
      return;
    }
    const contentTypes = {
      ".html": "text/html; charset=utf-8", ".css": "text/css; charset=utf-8",
      ".js": "text/javascript; charset=utf-8", ".pdf": "application/pdf",
      ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg",
      ".gif": "image/gif", ".svg": "image/svg+xml", ".ico": "image/x-icon",
      ".mp4": "video/mp4", ".mp3": "audio/mpeg", ".webp": "image/webp"
    };
    response.writeHead(200, {
      "Content-Type": contentTypes[path.extname(filePath).toLowerCase()],
      "Content-Length": stats.size,
      "X-Content-Type-Options": "nosniff"
    });
    if (request.method === "HEAD") {
      response.end();
    } else {
      fs.createReadStream(filePath).pipe(response);
    }
  });
}

http.createServer(function (request, response) {
  const url = new URL(request.url, "http://localhost");
  if (url.pathname === "/api/tutor") {
    handleTutor(request, response);
  } else if (request.method === "GET" || request.method === "HEAD") {
    serveStatic(request, response, url.pathname);
  } else {
    response.writeHead(405, { "Allow": "GET, HEAD, POST" }).end("Method not allowed");
  }
}).listen(port, function () {
  console.log("PorBhai is available at http://localhost:" + port);
});
