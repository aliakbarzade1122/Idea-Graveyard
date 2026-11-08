(() => {
  "use strict";

  const CONFIG = {
    endpoint: "https://fra.cloud.appwrite.io/v1",
    projectId: "idea-graveyard",
    functionId: "graveyard-api"
  };

  const AppwriteSDK = window.Appwrite;
  const client = new AppwriteSDK.Client()
    .setEndpoint(CONFIG.endpoint)
    .setProject(CONFIG.projectId);
  const account = new AppwriteSDK.Account(client);
  const functions = new AppwriteSDK.Functions(client);

  const state = {
    user: null,
    authMode: "login",
    activeGrave: null,
    searchTimer: null,
    search: "",
    status: "all"
  };

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));

  function escapeHtml(value) {
    return String(value ?? "").replace(/[&<>"']/g, (character) => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;"
    })[character]);
  }

  function formatDate(value) {
    if (!value) return "Date unknown";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "Date unknown";
    return new Intl.DateTimeFormat(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric"
    }).format(date);
  }

  function formatNumber(value) {
    return new Intl.NumberFormat().format(Number(value) || 0);
  }

  function notify(message, kind = "success") {
    const region = $("#toastRegion");
    const toast = document.createElement("div");
    toast.className = "toast" + (kind === "error" ? " toast--error" : "");
    toast.textContent = message;
    region.appendChild(toast);
    window.setTimeout(() => toast.remove(), 4200);
  }

  function setStatus(message) {
    $("#exploreStatus").textContent = message;
  }

  function showDialog(dialog) {
    if (!dialog) return;
    if (typeof dialog.showModal === "function") {
      if (!dialog.open) dialog.showModal();
    } else {
      dialog.setAttribute("open", "");
    }
  }

  function closeDialog(dialog) {
    if (!dialog) return;
    if (typeof dialog.close === "function" && dialog.open) dialog.close();
    else dialog.removeAttribute("open");
  }

  function handleApiResponse(execution) {
    let body = execution?.responseBody ?? execution?.response ?? {};
    if (typeof body === "string") {
      try {
        body = JSON.parse(body || "{}");
      } catch {
        body = { error: body || "The server returned an unreadable response." };
      }
    }
    const status = Number(execution?.responseStatusCode || execution?.statusCode || 200);
    if (status >= 400 || body?.error) {
      throw new Error(body?.error || "The request could not be completed.");
    }
    return body;
  }

  async function api(action, values = {}) {
    const execution = await functions.createExecution({
      functionId: CONFIG.functionId,
      body: JSON.stringify({ action, ...values }),
      async: false,
      method: "POST"
    });
    return handleApiResponse(execution);
  }

  function currentUserId() {
    return state.user?.$id || "";
  }

  function updateAuthUI() {
    const authButton = $("#authOpen");
    authButton.textContent = state.user ? "Sign out" : "Sign in";
    authButton.setAttribute("aria-label", state.user ? "Sign out" : "Sign in");
    $("#createOpen").textContent = "＋ Plant an idea";
  }

  function setAuthMode(mode) {
    state.authMode = mode === "register" ? "register" : "login";
    const isRegister = state.authMode === "register";
    $("#authTitle").innerHTML = isRegister ? "Make a little <em>space.</em>" : "Welcome <em>back.</em>";
    $("#authIntro").textContent = isRegister
      ? "Create an account to plant ideas and keep your private corner."
      : "Sign in to tend to your ideas and leave a little kindness behind.";
    $("#authNameField").hidden = !isRegister;
    $("#authNameField input").required = isRegister;
    $("#authForm [name=password]").autocomplete = isRegister ? "new-password" : "current-password";
    $("#authSubmit").textContent = isRegister ? "Create account" : "Sign in";
    $("#authError").hidden = true;
    $$("[data-auth-mode]").forEach((button) => {
      const active = button.dataset.authMode === state.authMode;
      button.classList.toggle("is-active", active);
      button.setAttribute("aria-selected", String(active));
    });
  }

  function openAuth(mode = "login") {
    setAuthMode(mode);
    showDialog($("#authDialog"));
  }

  function openCreate() {
    if (!state.user) {
      openAuth("login");
      notify("Sign in first to plant and manage your own ideas.", "error");
      return;
    }
    $("#createError").hidden = true;
    showDialog($("#createDialog"));
  }

  function graveStatus(grave) {
    if (grave.status === "resurrected") {
      return '<span class="status-pill status-pill--live">✦ Resurrected</span>';
    }
    return '<span class="status-pill">Resting</span>';
  }

  function graveCard(grave) {
    const id = escapeHtml(grave.$id);
    const title = escapeHtml(grave.title || "Untitled idea");
    const description = escapeHtml(grave.description || "This idea is resting quietly. Its story has not been written yet.");
    const theme = ["classic", "moonlit", "moss"].includes(grave.theme_id) ? grave.theme_id : "classic";
    const visibility = grave.visibility === "private" ? "Private" : "Public";
    return '<article class="grave-card theme-' + theme + '">' +
      '<button class="grave-card__open" type="button" data-open-grave-id="' + id + '" aria-label="Open grave: ' + title + '">' +
        '<div class="grave-card__top"><span class="stone-icon" aria-hidden="true">✦</span>' + graveStatus(grave) + '</div>' +
        '<h3>' + title + '</h3>' +
        '<p class="grave-card__description">' + description + '</p>' +
        '<div class="grave-card__meta"><span>' + escapeHtml(formatDate(grave.buried_at || grave.created_at)) + '</span><span>✿ ' + formatNumber(grave.flower_count) + ' · ' + visibility + '</span></div>' +
      '</button>' +
    '</article>';
  }

  function renderGraves(container, graves) {
    container.innerHTML = (graves || []).map(graveCard).join("");
  }

  function updateStats(stats = {}) {
    $("#statGraves").textContent = formatNumber(stats.graves);
    $("#statFlowers").textContent = formatNumber(stats.flowers);
    $("#statReturns").textContent = formatNumber(stats.resurrections);
  }

  async function loadExplore() {
    setStatus("Walking the grounds...");
    $("#exploreEmpty").hidden = true;
    try {
      const result = await api("explore", {
        limit: 60,
        status: state.status,
        search: state.search
      });
      const graves = Array.isArray(result.graves) ? result.graves : [];
      renderGraves($("#graveGrid"), graves);
      updateStats(result.stats || {});
      $("#exploreEmpty").hidden = graves.length !== 0;
      setStatus(graves.length
        ? "Showing " + formatNumber(graves.length) + " public " + (graves.length === 1 ? "grave." : "graves.")
        : "No graves match this search.");
    } catch (error) {
      setStatus("The grounds could not be opened.");
      $("#graveGrid").innerHTML = "";
      $("#exploreEmpty").hidden = false;
      notify(error.message || "Could not load the public graves.", "error");
    }
  }

  async function loadHall() {
    try {
      const result = await api("hall");
      const graves = Array.isArray(result.graves) ? result.graves : [];
      const grid = $("#hallGrid");
      if (!graves.length) {
        grid.innerHTML = '<div class="hall-placeholder">The Hall of Fame is waiting for its first comeback.</div>';
        return;
      }
      grid.innerHTML = graves.slice(0, 9).map((grave, index) => {
        const title = escapeHtml(grave.title || "Untitled idea");
        const id = escapeHtml(grave.$id);
        const returns = formatNumber(grave.resurrection_count);
        return '<button class="hall-card" type="button" data-open-grave-id="' + id + '">' +
          '<span class="hall-card__rank">No. ' + (index + 1) + ' · Hall of Fame</span>' +
          '<div class="hall-card__symbol" aria-hidden="true">✦</div>' +
          '<h3>' + title + '</h3>' +
          '<p>' + returns + (Number(grave.resurrection_count) === 1 ? ' resurrection' : ' resurrections') + '</p>' +
        '</button>';
      }).join("");
    } catch (error) {
      $("#hallGrid").innerHTML = '<div class="hall-placeholder">The Hall of Fame is unavailable right now.</div>';
      console.warn("Hall of Fame:", error);
    }
  }

  async function loadMyGraves() {
    if (!state.user) {
      openAuth("login");
      notify("Sign in to see your graves.", "error");
      return;
    }
    const section = $("#myGraves");
    section.hidden = false;
    section.scrollIntoView({ behavior: "smooth", block: "start" });
    $("#myGravesGrid").innerHTML = '<div class="hall-placeholder">Finding your graves...</div>';
    $("#myGravesEmpty").hidden = true;
    try {
      const result = await api("mine");
      const graves = Array.isArray(result.graves) ? result.graves : [];
      renderGraves($("#myGravesGrid"), graves);
      $("#myGravesEmpty").hidden = graves.length !== 0;
    } catch (error) {
      $("#myGravesGrid").innerHTML = "";
      notify(error.message || "Could not load your graves.", "error");
    }
  }

  function tributeMarkup(tributes) {
    if (!tributes || !tributes.length) {
      return '<p class="tribute-empty">No tributes yet. The first kind word is still waiting.</p>';
    }
    return tributes.map((tribute) =>
      '<article class="tribute-item"><p>' + escapeHtml(tribute.message) + '</p><time>' +
      escapeHtml(formatDate(tribute.created_at)) + '</time></article>'
    ).join("");
  }

  async function openGrave(graveId) {
    const dialog = $("#graveDialog");
    const panel = $("#graveDetail");
    panel.innerHTML = '<button class="modal__close" type="button" data-close-dialog aria-label="Close">×</button><div class="grave-detail__loading">Opening this story...</div>';
    showDialog(dialog);
    try {
      const result = await api("view-grave", { grave_id: graveId });
      state.activeGrave = result.grave;
      renderGraveDetail(result.grave, result.tributes || []);
    } catch (error) {
      closeDialog(dialog);
      notify(error.message || "This grave could not be opened.", "error");
    }
  }

  function renderGraveDetail(grave, tributes) {
    const isOwner = Boolean(state.user && grave.owner_id === currentUserId());
    const isResurrected = grave.status === "resurrected";
    const title = escapeHtml(grave.title || "Untitled idea");
    const description = escapeHtml(grave.description || "No story has been added yet.");
    const reason = grave.death_reason ? '<div class="grave-detail__reason"><strong>Why it stopped</strong><br>' + escapeHtml(grave.death_reason) + '</div>' : "";
    const privateLabel = grave.visibility === "private" ? " · Private" : " · Public";
    const actionButton = isOwner
      ? '<button class="button button--gold" type="button" id="resurrectAction">' + (isResurrected ? "Bury again" : "Bring it back to life") + '</button>'
      : '<button class="button button--gold" type="button" id="flowerAction">✿ Leave a flower</button>';
    const tributeForm = grave.visibility === "private" && !isOwner
      ? ""
      : (state.user
        ? '<form class="tribute-form" id="tributeForm"><textarea name="message" rows="2" maxlength="500" minlength="2" required placeholder="Leave a kind word..."></textarea><button class="button button--outline" type="submit">Leave tribute</button></form>'
        : '<p class="tribute-empty">Sign in to leave a tribute.</p>');
    $("#graveDetail").innerHTML =
      '<button class="modal__close" type="button" data-close-dialog aria-label="Close">×</button>' +
      '<div class="grave-detail__header"><div class="grave-detail__stone" aria-hidden="true">✦</div>' +
      graveStatus(grave) + '<h2 id="graveTitle">' + title + '</h2>' +
      '<div class="grave-detail__date">Laid to rest ' + escapeHtml(formatDate(grave.buried_at || grave.created_at)) + privateLabel + '</div></div>' +
      '<div class="grave-detail__body">' + description + '</div>' + reason +
      '<div class="grave-detail__stats"><span>✿ ' + formatNumber(grave.flower_count) + ' flowers</span><span>↗ ' + formatNumber(grave.visit_count) + ' visits</span><span>✦ ' + formatNumber(grave.resurrection_count) + ' returns</span></div>' +
      '<div class="grave-detail__actions">' + actionButton + '</div>' +
      '<section class="tribute-section"><h3>Tributes</h3><div class="tribute-list" id="tributeList">' + tributeMarkup(tributes) + '</div>' + tributeForm + '</section>';

    const flowerButton = $("#flowerAction");
    if (flowerButton) {
      flowerButton.addEventListener("click", async () => {
        if (!state.user) {
          openAuth("login");
          notify("Sign in to leave a flower.", "error");
          return;
        }
        flowerButton.disabled = true;
        try {
          await api("flower", { grave_id: grave.$id, flower_type: "wildflower", quantity: 1 });
          notify("A flower has been left with care.");
          await refreshActiveGrave();
          await loadExplore();
        } catch (error) {
          flowerButton.disabled = false;
          notify(error.message || "The flower could not be placed.", "error");
        }
      });
    }

    const resurrectButton = $("#resurrectAction");
    if (resurrectButton) {
      resurrectButton.addEventListener("click", async () => {
        resurrectButton.disabled = true;
        try {
          const nextState = !isResurrected;
          await api("resurrect", { grave_id: grave.$id, resurrect: nextState });
          notify(nextState ? "This idea has been brought back to life." : "This idea has been laid to rest again.");
          await refreshActiveGrave();
          await loadExplore();
          await loadHall();
          if (!$("#myGraves").hidden) await loadMyGraves();
        } catch (error) {
          resurrectButton.disabled = false;
          notify(error.message || "That change could not be saved.", "error");
        }
      });
    }

    const tributeFormElement = $("#tributeForm");
    if (tributeFormElement) {
      tributeFormElement.addEventListener("submit", async (event) => {
        event.preventDefault();
        const submit = tributeFormElement.querySelector("button[type=submit]");
        const message = new FormData(tributeFormElement).get("message");
        submit.disabled = true;
        try {
          await api("tribute", { grave_id: grave.$id, message });
          notify("Your tribute has been added.");
          await refreshActiveGrave();
        } catch (error) {
          submit.disabled = false;
          notify(error.message || "Your tribute could not be saved.", "error");
        }
      });
    }
  }

  async function refreshActiveGrave() {
    if (!state.activeGrave?.$id) return;
    const result = await api("view-grave", { grave_id: state.activeGrave.$id });
    state.activeGrave = result.grave;
    renderGraveDetail(result.grave, result.tributes || []);
  }

  async function submitAuth(event) {
    event.preventDefault();
    const form = $("#authForm");
    const submit = $("#authSubmit");
    const errorBox = $("#authError");
    const values = new FormData(form);
    const email = String(values.get("email") || "").trim();
    const password = String(values.get("password") || "");
    const name = String(values.get("name") || "").trim();
    errorBox.hidden = true;
    submit.disabled = true;

    try {
      if (state.authMode === "register") {
        await account.create({
          userId: AppwriteSDK.ID.unique(),
          email,
          password,
          name
        });
      }
      await account.createEmailPasswordSession({ email, password });
      state.user = await account.get();
      updateAuthUI();
      closeDialog($("#authDialog"));
      form.reset();
      notify(state.authMode === "register" ? "Your account is ready. Welcome to the grounds." : "Welcome back.");
      await loadExplore();
      await loadHall();
    } catch (error) {
      errorBox.textContent = error.message || "Authentication failed. Please try again.";
      errorBox.hidden = false;
    } finally {
      submit.disabled = false;
    }
  }

  async function signOut() {
    try {
      await account.deleteSession({ sessionId: "current" });
    } catch (error) {
      console.warn("Sign out:", error);
    }
    state.user = null;
    updateAuthUI();
    $("#myGraves").hidden = true;
    if (state.activeGrave) {
      state.activeGrave = null;
      closeDialog($("#graveDialog"));
    }
    notify("You have signed out.");
  }

  async function submitCreate(event) {
    event.preventDefault();
    if (!state.user) {
      closeDialog($("#createDialog"));
      openAuth("login");
      return;
    }
    const form = $("#createForm");
    const submit = $("#createSubmit");
    const errorBox = $("#createError");
    const values = new FormData(form);
    errorBox.hidden = true;
    submit.disabled = true;
    try {
      await api("create-grave", {
        title: String(values.get("title") || "").trim(),
        description: String(values.get("description") || "").trim(),
        death_reason: String(values.get("death_reason") || "").trim(),
        visibility: values.get("visibility"),
        theme_id: values.get("theme_id")
      });
      closeDialog($("#createDialog"));
      form.reset();
      notify("Your idea has found its resting place.");
      await loadExplore();
      await loadMyGraves();
    } catch (error) {
      errorBox.textContent = error.message || "The grave could not be created.";
      errorBox.hidden = false;
    } finally {
      submit.disabled = false;
    }
  }

  function bindEvents() {
    $("#authOpen").addEventListener("click", () => {
      if (state.user) signOut();
      else openAuth("login");
    });
    ["#createOpen", "#heroCreate", "#exploreCreate"].forEach((selector) => {
      $(selector).addEventListener("click", openCreate);
    });
    $("#myGravesNav").addEventListener("click", loadMyGraves);
    $("#refreshExplore").addEventListener("click", loadExplore);
    $("#authForm").addEventListener("submit", submitAuth);
    $("#createForm").addEventListener("submit", submitCreate);

    $$("[data-auth-mode]").forEach((button) => {
      button.addEventListener("click", () => setAuthMode(button.dataset.authMode));
    });

    document.addEventListener("click", (event) => {
      const closeButton = event.target.closest("[data-close-dialog]");
      if (closeButton) {
        const dialog = closeButton.closest("dialog");
        closeDialog(dialog);
        return;
      }
      const createButton = event.target.closest("[data-open-create]");
      if (createButton) {
        openCreate();
        return;
      }
      const graveButton = event.target.closest("[data-open-grave-id]");
      if (graveButton) {
        openGrave(graveButton.dataset.openGraveId);
      }
    });

    $("#graveSearch").addEventListener("input", (event) => {
      state.search = event.target.value.trim();
      window.clearTimeout(state.searchTimer);
      state.searchTimer = window.setTimeout(loadExplore, 350);
    });
    $("#graveFilter").addEventListener("change", (event) => {
      state.status = event.target.value;
      loadExplore();
    });

    $("#mobileMenu").addEventListener("click", () => {
      const menu = $(".main-nav");
      const open = menu.classList.toggle("is-open");
      $("#mobileMenu").setAttribute("aria-expanded", String(open));
    });
    $$(".main-nav a").forEach((link) => {
      link.addEventListener("click", () => {
        $(".main-nav").classList.remove("is-open");
        $("#mobileMenu").setAttribute("aria-expanded", "false");
      });
    });
  }

  async function start() {
    bindEvents();
    setAuthMode("login");
    updateAuthUI();
    try {
      state.user = await account.get();
    } catch {
      state.user = null;
    }
    updateAuthUI();
    await Promise.all([loadExplore(), loadHall()]);
  }

  start().catch((error) => {
    console.error("Idea Graveyard startup:", error);
    setStatus("The app could not start. Please reload the page.");
    notify("The site could not start. Please reload the page.", "error");
  });
})();