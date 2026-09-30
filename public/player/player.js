const socket = io(location.hostname.endsWith(".vercel.app") ? { transports: ["websocket"] } : {});

const HAND = { rock: "🤜", paper: "🫱", scissors: "✌️" };

const meName = document.getElementById("meName");
const meBadge = document.getElementById("meBadge");
const meScore = document.getElementById("meScore");
const meEmoji = document.getElementById("meEmoji");
const oppName = document.getElementById("oppName");
const oppScore = document.getElementById("oppScore");
const oppEmoji = document.getElementById("oppEmoji");
const oppBox = document.getElementById("oppBox");
const roomChip = document.getElementById("roomChip");
const countdown = document.getElementById("countdown");
const hintEl = document.getElementById("hint");
const gameView = document.getElementById("gameView");
const selectArea = document.getElementById("selectArea");
const handConfirm = document.getElementById("handConfirm");
const actionArea = document.getElementById("actionArea");
const rulesBtn = document.getElementById("rulesBtn");
const rulesSheet = document.getElementById("rulesSheet");
const rulesClose = document.getElementById("rulesClose");
const rulesTitle = document.getElementById("rulesTitle");
const langBtn = document.getElementById("langBtn");
const foldBtn = document.getElementById("foldBtn");

let myRole = "";
let firstPlayer = "";
let phase = "wait";
let names = { player1: "", player2: "" };
let shownChore = "";
let mySelected = "";
let selectedAction = "";
let actionLocked = false;
let timer = null;
let hintState = { key: "wait" };
let foldArmed = false;

socket.emit("joinGame");

function setHint(key, extra) {
    hintState = { key, extra: extra || null };
    renderHint();
}

function renderHint() {
    if (hintState.key === "oppHand") {
        hintEl.textContent = t("them") + " " + (hintState.extra || "");
        return;
    }
    if (hintState.key === "result") {
        const extra = hintState.extra;
        hintEl.textContent = extra.mine + " " + t(extra.mark) + " " + extra.theirs;
        return;
    }
    hintEl.textContent = t(hintState.key);
}

function setPhase(name) {
    phase = name;
    document.body.classList.remove("phase-wait", "phase-play", "phase-final");
    document.body.classList.add("phase-" + name);
}

function applyLanguage() {
    const english = currentLang() === "en";
    document.documentElement.lang = english ? "en" : "zh";
    document.body.classList.toggle("en", english);
    document.title = t("title");
    langBtn.textContent = english ? "中" : "EN";
    langBtn.setAttribute("aria-label", t("switchLang"));
    rulesBtn.setAttribute("aria-label", t("rules"));
    rulesClose.setAttribute("aria-label", t("close"));
    rulesTitle.textContent = t("rules");
    document.querySelectorAll("[data-key]").forEach((el) => {
        if (el.tagName === "BUTTON") return;
        el.textContent = t(el.dataset.key);
    });
    handConfirm.textContent = t("ok");
    document.querySelectorAll(".confirm").forEach((btn) => {
        btn.textContent = t("ok");
    });
    document.querySelectorAll(".action").forEach((btn) => {
        const label = btn.querySelector(".lbl");
        if (label && btn.dataset.key) label.textContent = t(btn.dataset.key);
    });
    if (shownChore) roomChip.textContent = t(shownChore);
    foldBtn.textContent = foldArmed ? t("ok") : t("fold");
    updateBadge();
    renderNames();
    renderHint();
}

function otherRole() {
    return myRole === "player1" ? "player2" : "player1";
}

function renderNames() {
    if (names[myRole]) meName.textContent = names[myRole];
    oppName.textContent = names[otherRole()] || t("them");
}

function renderScores(p1, p2) {
    meScore.textContent = myRole === "player1" ? p1 : p2;
    oppScore.textContent = myRole === "player1" ? p2 : p1;
}

function updateBadge() {
    if (phase !== "play" || !myRole) {
        meBadge.hidden = true;
        return;
    }
    meBadge.hidden = false;
    meBadge.textContent = myRole === firstPlayer ? t("first") : t("later");
}

function showScores(on) {
    meScore.hidden = !on;
    oppScore.hidden = !on;
}

function clearActions() {
    actionArea.innerHTML = "";
}

function showSelect() {
    selectArea.hidden = false;
    handConfirm.hidden = false;
}

function hideSelect() {
    selectArea.hidden = true;
}

function startTimer() {
    let time = 20;
    countdown.hidden = false;
    clearInterval(timer);
    countdown.textContent = time;
    timer = setInterval(() => {
        time -= 1;
        countdown.textContent = time;
        if (time <= 0) clearInterval(timer);
    }, 1000);
}

function addActionButton(action, icon, labelKey) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "action";
    btn.dataset.key = labelKey;
    const ico = document.createElement("span");
    ico.className = "ico";
    ico.textContent = icon;
    const lbl = document.createElement("span");
    lbl.className = "lbl";
    lbl.textContent = t(labelKey);
    btn.append(ico, lbl);
    btn.addEventListener("click", () => {
        if (actionLocked) return;
        selectedAction = action;
        actionArea.querySelectorAll(".action").forEach((item) => item.classList.remove("active"));
        btn.classList.add("active");
    });
    actionArea.appendChild(btn);
}

function addConfirmButton() {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "confirm";
    btn.textContent = t("ok");
    btn.addEventListener("click", () => {
        if (!selectedAction) {
            setHint("choose");
            return;
        }
        actionLocked = true;
        btn.classList.add("active");
        socket.emit(selectedAction);
        setTimeout(clearActions, 200);
    });
    actionArea.appendChild(btn);
}

document.querySelectorAll(".hand").forEach((btn) => {
    btn.addEventListener("click", () => {
        mySelected = btn.dataset.hand;
        document.querySelectorAll(".hand").forEach((item) => item.classList.remove("active"));
        btn.classList.add("active");
    });
});

handConfirm.addEventListener("click", () => {
    if (!mySelected) {
        setHint("throw");
        return;
    }
    socket.emit("select", mySelected);
    socket.emit("confirm");
    handConfirm.classList.add("active");
    setTimeout(() => {
        handConfirm.classList.remove("active");
        hideSelect();
    }, 200);
});

document.getElementById("emojiButtons").addEventListener("click", (event) => {
    const btn = event.target.closest("button");
    if (!btn) return;
    socket.emit("emoji", btn.dataset.emoji);
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

langBtn.addEventListener("click", () => {
    toggleLang();
    applyLanguage();
});

foldBtn.addEventListener("click", () => {
    if (phase !== "play") return;
    if (!foldArmed) {
        foldArmed = true;
        foldBtn.classList.add("armed");
        foldBtn.textContent = t("ok");
        return;
    }
    foldArmed = false;
    foldBtn.classList.remove("armed");
    socket.emit("surrender");
});

applyLanguage();

socket.on("startGame", (data) => {
    myRole = data.role;
    firstPlayer = data.firstPlayer;
    names = { player1: "", player2: "" };
    renderScores(data.p1Score, data.p2Score);
    setHint("wait");
});

socket.on("contestStart", (data) => {
    myRole = data.role;
    firstPlayer = data.firstPlayer;
    names = data.names;
    shownChore = data.chore || "";
    roomChip.textContent = shownChore ? t(shownChore) : "";
    renderNames();
    renderScores(data.p1Score, data.p2Score);
    mySelected = "";
    selectedAction = "";
    actionLocked = false;
    document.querySelectorAll(".hand").forEach((item) => item.classList.remove("active"));
    meName.hidden = false;
    meBadge.hidden = true;
    roomChip.hidden = false;
    showScores(true);
    showSelect();
    clearActions();
    foldArmed = false;
    foldBtn.hidden = false;
    foldBtn.classList.remove("armed");
    foldBtn.textContent = t("fold");
    setPhase("play");
    setHint("throw");
    startTimer();
});

socket.on("contestResume", (data) => {
    myRole = data.role;
    firstPlayer = data.firstPlayer;
    names = data.names;
    shownChore = data.chore || "";
    roomChip.textContent = shownChore ? t(shownChore) : "";
    renderNames();
    renderScores(data.p1Score, data.p2Score);
    meName.hidden = false;
    meBadge.hidden = true;
    roomChip.hidden = false;
    showScores(true);
    clearActions();
    foldArmed = false;
    foldBtn.hidden = false;
    foldBtn.classList.remove("armed");
    foldBtn.textContent = t("fold");
    setPhase("play");
    setHint("wait");
    if (data.stage === "select" ||
        (data.stage === "p1Change" && myRole === firstPlayer) ||
        (data.stage === "p2Change" && myRole !== firstPlayer)) {
        showSelect();
    } else {
        hideSelect();
    }
});

socket.on("gameState", (data) => {
    if (data.firstPlayer) firstPlayer = data.firstPlayer;
    if (phase === "play" && data.p1Score != null) {
        renderScores(data.p1Score, data.p2Score);
        updateBadge();
    }
    if (phase !== "play") return;

    const myChange = (data.stage === "p1Change" && myRole === firstPlayer) ||
        (data.stage === "p2Change" && myRole !== firstPlayer);

    if (data.stage === "select" || myChange) showSelect();
    else hideSelect();
});

socket.on("p1Turn", () => {
    selectedAction = "";
    actionLocked = false;
    clearActions();
    startTimer();
    if (myRole === firstPlayer) {
        setHint("turn");
        addActionButton("peep", "🫣", "peep");
        addActionButton("p1Double", "×2", "double");
        addConfirmButton();
    } else {
        setHint("wait");
    }
});

socket.on("p2Turn", () => {
    selectedAction = "";
    actionLocked = false;
    clearActions();
    startTimer();
    if (myRole !== firstPlayer) {
        setHint("turn");
        addActionButton("checkPeeping", "👀", "peekedQ");
        addActionButton("checkLose", "±", "losingQ");
        addActionButton("p2Double", "×2", "double");
        addConfirmButton();
    } else {
        setHint("wait");
    }
});

socket.on("peekResult", (choice) => {
    setHint("oppHand", HAND[choice] || "");
});

socket.on("peepStatus", (status) => {
    setHint(status ? "peeked" : "hidden");
});

socket.on("loseStatus", (lose) => {
    setHint(lose ? "losing" : "safe");
});

socket.on("finalStage", () => {
    selectedAction = "";
    actionLocked = false;
    clearActions();
    startTimer();
    setPhase("final");
    setHint("show");
    addActionButton("proposeDraw", "🤝", "draw");
    addActionButton("reveal", "🎴", "show");
    addConfirmButton();
});

socket.on("revealResult", (data) => {
    renderScores(data.p1Score, data.p2Score);
    const mine = myRole === "player1" ? data.p1 : data.p2;
    const theirs = myRole === "player1" ? data.p2 : data.p1;
    let mark = "drawWord";
    if (data.winner === "p1") mark = myRole === "player1" ? "win" : "lose";
    if (data.winner === "p2") mark = myRole === "player2" ? "win" : "lose";
    setHint("result", {
        mine: HAND[mine] || "",
        mark: mark,
        theirs: HAND[theirs] || ""
    });
    clearActions();
    hideSelect();
    clearInterval(timer);
    setTimeout(() => socket.emit("ackReveal"), 900);
});

socket.on("startNextRound", (data) => {
    mySelected = "";
    selectedAction = "";
    actionLocked = false;
    firstPlayer = data.firstPlayer;
    document.querySelectorAll(".hand").forEach((item) => item.classList.remove("active"));
    meEmoji.textContent = "";
    oppEmoji.textContent = "";
    renderScores(data.p1Score, data.p2Score);
    showSelect();
    clearActions();
    setPhase("play");
    setHint(data.tie ? "replay" : "throw");
    startTimer();
});

socket.on("loserPick", () => {
    window.location.href = "/";
});

socket.on("choreDone", () => {
    window.location.href = "/";
});

socket.on("emoji", (data) => {
    const target = data.role === myRole ? meEmoji : oppEmoji;
    target.textContent = data.emoji;
});

socket.on("playerLeft", () => {
    window.location.href = "/";
});

socket.on("observer", () => {
    window.location.href = "/observer/observer.html";
});
