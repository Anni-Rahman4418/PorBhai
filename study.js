(function () {
  "use strict";

  const MAX_PDF_SIZE = 25 * 1024 * 1024;
  const pdfInput = document.getElementById("pdfFile");
  const replaceInput = document.getElementById("replacePdf");
  const uploadPanel = document.getElementById("uploadPanel");
  const readerToolbar = document.getElementById("readerToolbar");
  const readerStatus = document.getElementById("readerStatus");
  const readerHint = document.getElementById("readerHint");
  const pdfStage = document.getElementById("pdfStage");
  const pdfPage = document.getElementById("pdfPage");
  const canvas = document.getElementById("pdfCanvas");
  const textLayer = document.getElementById("textLayer");
  const fileName = document.getElementById("fileName");
  const pageCount = document.getElementById("pageCount");
  const previousPage = document.getElementById("previousPage");
  const nextPage = document.getElementById("nextPage");
  const chatForm = document.getElementById("chatForm");
  const chatInput = document.getElementById("chatInput");
  const askButton = document.getElementById("askButton");
  const chatMessages = document.getElementById("chatMessages");

  let documentHandle = null;
  let currentPage = 1;
  let pageText = "";
  let conversation = [];
  let requestInProgress = false;

  if (!window.pdfjsLib) {
    setStatus("The PDF reader could not load. Check your internet connection and reload this page.", true);
    pdfInput.disabled = true;
    return;
  }

  window.pdfjsLib.GlobalWorkerOptions.workerSrc =
    "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";

  function setStatus(message, isError) {
    readerStatus.textContent = message;
    readerStatus.classList.toggle("error", Boolean(isError));
  }

  function addMessage(text, role) {
    const bubble = document.createElement("div");
    bubble.className = "chat-message " + (role === "user" ? "user-message" : "assistant-message");
    const paragraph = document.createElement("p");
    paragraph.textContent = text;
    bubble.appendChild(paragraph);
    chatMessages.appendChild(bubble);
    chatMessages.scrollTop = chatMessages.scrollHeight;
    return bubble;
  }

  function updatePageControls() {
    pageCount.textContent = "Page " + currentPage + " of " + documentHandle.numPages;
    previousPage.disabled = currentPage <= 1;
    nextPage.disabled = currentPage >= documentHandle.numPages;
  }

  async function renderPage(pageNumber) {
    currentPage = pageNumber;
    setStatus("Loading page " + pageNumber + "...", false);
    textLayer.replaceChildren();

    try {
      const page = await documentHandle.getPage(pageNumber);
      const availableWidth = Math.max(280, pdfStage.clientWidth - 32);
      const baseViewport = page.getViewport({ scale: 1 });
      const scale = Math.min(1.7, availableWidth / baseViewport.width);
      const viewport = page.getViewport({ scale: scale });
      const pixelRatio = window.devicePixelRatio || 1;
      const context = canvas.getContext("2d");
      textLayer.style.setProperty("--scale-factor", scale);
      canvas.width = Math.floor(viewport.width * pixelRatio);
      canvas.height = Math.floor(viewport.height * pixelRatio);
      canvas.style.width = viewport.width + "px";
      canvas.style.height = viewport.height + "px";
      pdfPage.style.width = viewport.width + "px";
      pdfPage.style.height = viewport.height + "px";
      textLayer.style.width = viewport.width + "px";
      textLayer.style.height = viewport.height + "px";
      await page.render({
        canvasContext: context,
        viewport: viewport,
        transform: pixelRatio === 1 ? null : [pixelRatio, 0, 0, pixelRatio, 0, 0]
      }).promise;

      setStatus("Preparing selectable text...", false);
      const textContent = await page.getTextContent();
      pageText = textContent.items.map(function (item) {
        return item.str;
      }).join(" ").replace(/\s+/g, " ").trim();
      textLayer.replaceChildren();
      await window.pdfjsLib.renderTextLayer({
        textContent: textContent,
        container: textLayer,
        viewport: viewport,
        textDivs: []
      }).promise;

      updatePageControls();
      setStatus("Page " + pageNumber + " is ready. Click a word to ask about it.", false);
    } catch (error) {
      setStatus("Could not display this page. Try another PDF or page.", true);
      console.error("PDF page rendering failed:", error);
    }
  }

  async function openPdf(file) {
    if (!file) return;
    if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
      setStatus("Please choose a PDF file.", true);
      return;
    }
    if (file.size > MAX_PDF_SIZE) {
      setStatus("This PDF is larger than 25 MB. Choose a smaller file.", true);
      return;
    }

    setStatus("Opening " + file.name + "...", false);
    try {
      const nextDocument = await window.pdfjsLib.getDocument({ data: await file.arrayBuffer() }).promise;
      if (documentHandle) await documentHandle.destroy();
      documentHandle = nextDocument;
      currentPage = 1;
      conversation = [];
      fileName.textContent = file.name;
      chatMessages.replaceChildren();
      addMessage("Your PDF is ready. Click or select a word in the page, or ask me a question about it.", "assistant");
      uploadPanel.hidden = true;
      readerToolbar.hidden = false;
      pdfStage.hidden = false;
      readerHint.hidden = false;
      await renderPage(currentPage);
    } catch (error) {
      setStatus("We could not open this PDF. It may be damaged, password-protected, or image-only.", true);
      console.error("PDF could not be opened:", error);
    }
  }

  function selectedWordAtPoint(event) {
    let range = null;
    if (document.caretRangeFromPoint) {
      range = document.caretRangeFromPoint(event.clientX, event.clientY);
    } else if (document.caretPositionFromPoint) {
      const position = document.caretPositionFromPoint(event.clientX, event.clientY);
      if (position) {
        range = document.createRange();
        range.setStart(position.offsetNode, position.offset);
      }
    }
    if (!range || !textLayer.contains(range.startContainer) || range.startContainer.nodeType !== Node.TEXT_NODE) return "";

    const text = range.startContainer.textContent;
    const offset = range.startOffset;
    const words = text.matchAll(/[\p{L}\p{M}\p{N}]+(?:['’\-][\p{L}\p{M}\p{N}]+)*/gu);
    for (const match of words) {
      if (offset >= match.index && offset <= match.index + match[0].length) return match[0];
    }
    return "";
  }

  async function askTutor(question, mode, word) {
    if (requestInProgress) return;
    requestInProgress = true;
    askButton.disabled = true;
    const thinking = addMessage("Thinking...", "assistant");
    try {
      const response = await fetch("/api/tutor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: mode,
          question: question,
          word: word || "",
          context: pageText.slice(0, 8000),
          history: conversation.slice(-8)
        })
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "The tutor could not answer. Please try again.");
      thinking.querySelector("p").textContent = result.answer;
      conversation.push({ role: "user", content: question });
      conversation.push({ role: "assistant", content: result.answer });
      conversation = conversation.slice(-8);
    } catch (error) {
      thinking.querySelector("p").textContent = error.message || "Could not reach the AI tutor. Please try again.";
    } finally {
      requestInProgress = false;
      askButton.disabled = false;
      chatMessages.scrollTop = chatMessages.scrollHeight;
    }
  }

  pdfInput.addEventListener("change", function () {
    openPdf(pdfInput.files[0]);
    pdfInput.value = "";
  });
  replaceInput.addEventListener("change", function () {
    openPdf(replaceInput.files[0]);
    replaceInput.value = "";
  });
  previousPage.addEventListener("click", function () {
    if (documentHandle && currentPage > 1) renderPage(currentPage - 1);
  });
  nextPage.addEventListener("click", function () {
    if (documentHandle && currentPage < documentHandle.numPages) renderPage(currentPage + 1);
  });
  textLayer.addEventListener("click", function (event) {
    const selection = window.getSelection().toString().trim();
    const word = selection || selectedWordAtPoint(event);
    if (!word) return;
    const question = "Explain the word \"" + word + "\" in simple language, using its meaning in this PDF page.";
    chatInput.value = question;
    askTutor(question, "word", word);
  });
  chatForm.addEventListener("submit", function (event) {
    event.preventDefault();
    const question = chatInput.value.trim();
    if (!question || requestInProgress) return;
    chatInput.value = "";
    addMessage(question, "user");
    askTutor(question, "chat", "");
  });

  const fileUrl = new URLSearchParams(window.location.search).get("file");
  if (fileUrl) {
    const pdfUrl = new URL(fileUrl, window.location.href);
    if (pdfUrl.origin !== window.location.origin || !pdfUrl.pathname.toLowerCase().endsWith(".pdf")) {
      setStatus("The PDF link must point to a PDF on this website.", true);
    } else {
      setStatus("Loading textbook PDF...", false);
      window.pdfjsLib.getDocument(pdfUrl.href).promise.then(function (pdf) {
        documentHandle = pdf;
        fileName.textContent = decodeURIComponent(pdfUrl.pathname.split("/").pop());
        uploadPanel.hidden = true;
        readerToolbar.hidden = false;
        pdfStage.hidden = false;
        readerHint.hidden = false;
        chatMessages.replaceChildren();
        addMessage("Your textbook is ready. Click a word or ask me something about the current page.", "assistant");
        renderPage(1);
      }).catch(function (error) {
        setStatus("Could not load this textbook PDF. You can choose a PDF from your device instead.", true);
        console.error("Linked PDF could not be opened:", error);
      });
    }
  }
})();
