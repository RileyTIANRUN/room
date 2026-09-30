const socket = io(location.hostname.endsWith(".vercel.app") ? { transports: ["websocket"] } : {});

const nameInput = document.getElementById("nameInput");
const subtitle = document.getElementById("subtitle");
const todoList = document.getElementById("todoList");
const status = document.getElementById("status");
const langBtn = document.getElementById("langBtn");
const rulesBtn = document.getElementById("rulesBtn");
const rulesSheet = document.getElementById("rulesSheet");
const rulesClose = document.getElementById("rulesClose");
const rulesTitle = document.getElementById("rulesTitle");

let state = { assignment: {}, myPick: null, locked: false };

function renderTodo() {
    todoList.innerHTML = "";
    CHORES.forEach((chore) => {
        const owner = state.assignment[chore.id];
        const el = document.createElement("div");
        el.className = "choreItem";
        el.dataset.chore = chore.id;
        if (owner) el.classList.add("taken");
        else if (state.myPick === chore.id) el.classList.add("selected");
        else if (state.locked) el.classList.add("disabled");

        const ico = document.createElement("span");
        ico.className = "ico";
        ico.textContent = chore.icon;

        const lbl = document.createElement("span");
        lbl.className = "lbl";
        lbl.dataset.key = chore.id;
        lbl.textContent = t(chore.id);

        const ownerEl = document.createElement("span");
        ownerEl.className = "owner";
        ownerEl.textContent = owner ? (state.names && state.names[owner] ? state.names[owner] : owner) : "";

        el.append(ico, lbl, ownerEl);
        el.addEventListener("click", () => pickChore(chore.id));
        todoList.appendChild(el);
    });
}

function applyLanguage() {
    const english = currentLang() === "en";
    document.documentElement.lang = english ? "en" : "zh";
    document.body.classList.toggle("en", english);
    document.title = t("title");
    document.getElementById("title").textContent = t("title");
    nameInput.placeholder = t("name");
    subtitle.textContent = t("subtitle");
    status.textContent = state.myPick ? t("wait") : t("pick");
    langBtn.textContent = english ? "中" : "EN";
    langBtn.setAttribute("aria-label", t("switchLang"));
    rulesBtn.setAttribute("aria-label", t("rules"));
    rulesClose.setAttribute("aria-label", t("close"));
    rulesTitle.textContent = t("rules");
    document.querySelectorAll("[data-key]").forEach((el) => {
        el.textContent = t(el.dataset.key);
    });
    renderTodo();
}

function pickChore(id) {
    if (state.locked || state.assignment[id]) return;
    const name = nameInput.value.trim().slice(0, 8);
    if (!name) {
        status.textContent = t("needName");
        return;
    }
    state.myPick = id;
    state.locked = true;
    status.textContent = t("wait");
    renderTodo();
    socket.emit("pickChore", { name, chore: id });
}

langBtn.addEventListener("click", () => {
    toggleLang();
    applyLanguage();
});

rulesBtn.addEventListener("click", () => {
    rulesSheet.hidden = false;
});

rulesClose.addEventListener("click", () => {
    rulesSheet.hidden = true;
});

rulesSheet.addEventListener("click", (event) => {
    if (event.target === rulesSheet) rulesSheet.hidden = true;
});

socket.emit("joinGame");

socket.on("todoUpdate", (data) => {
    state.assignment = data.assignment || {};
    state.names = data.names || {};
    renderTodo();
});

socket.on("pickStatus", (data) => {
    state.names = data.names || {};
    renderTodo();
});

socket.on("contestStart", () => {
    window.location.href = "player/player.html";
});

socket.on("choreDone", (data) => {
    state.assignment = data.assignment || {};
    state.names = data.names || {};
    state.locked = true;
    renderTodo();
    status.textContent = t("done");
});

applyLanguage();
