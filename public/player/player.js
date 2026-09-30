const socket = io(location.hostname.endsWith(".vercel.app") ? { transports: ["websocket"] } : {});

const CHORES = [
    { id: "dishes", icon: "🍽️" },
    { id: "mop", icon: "🧹" },
    { id: "trash", icon: "🗑️" },
    { id: "sweep", icon: "🧽" },
    { id: "package", icon: "📦" }
];
const HAND = { rock: "🤜", paper: "🫱", scissors: "✌️" };

const nameInput = document.getElementById("nameInput");
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
const planWrap = document.getElementById("planWrap");
const choreGrid = document.getElementById("choreGrid");
const selectedChore = document.getElementById("selectedChore");
const pickConfirm = document.getElementById("pickConfirm");
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
let assignment = {};
let selectedChoreId = "";
let pickLocked = false;
let loserRole = "";
let mySelected = "";
let selectedAction = "";
let actionLocked = false;
let timer = null;
let hintState = { key: "wait" };
let shownChore = "";
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
    document.body.classList.remove("phase-wait", "phase-pick", "phase-play", "phase-loser", "phase-done");
    document.body.classList.add("phase-" + name);
}

function applyLanguage() {
    const english = currentLang() === "en";
    document.documentElement.lang = english ? "en" : "zh";
    document.body.classList.toggle("en", english);
    document.title = t("title");
    langBtn.textContent = english ? "中" : "EN";
    langBtn.setAttribute("aria-label", t("switchLang"));
    nameInput.placeholder = t("name");
    rulesBtn.setAttribute("aria-label", t("rules"));
    rulesClose.setAttribute("aria-label", t("close"));
    rulesTitle.textContent = t("rules");
    document.querySelectorAll("[data-key]").forEach((el) => {
        if (el.tagName === "BUTTON") return;
        el.textContent = t(el.dataset.key);
    });
    document.querySelectorAll(".choreCard").forEach((card) => {
        card.setAttribute("aria-label", t(card.dataset.chore));
    });
    pickConfirm.textContent = t("ok");
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
    paintChores();
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

function isTaken(chore) {
    return assignment[chore] != null;
}

function paintChores() {
    choreGrid.querySelectorAll(".choreCard").forEach((card) => {
        const id = card.dataset.chore;
        const ownerRole = assignment[id];
        const ownerName = ownerRole ? (names[ownerRole] || "") : "";
        card.classList.remove("selected", "taken", "open");
        if (ownerName) card.classList.add("taken");
        const ico = card.querySelector(".ico");
        if (ownerName) {
            ico.textContent = ownerName;
        } else {
            const found = CHORES.find((c) => c.id === id);
            if (found) ico.textContent = found.icon;
        }
        if (phase === "pick" && selectedChoreId === id) card.classList.add("selected");
        if (phase === "loser" && !ownerRole && myRole === loserRole) card.classList.add("open");
        if (phase === "loser" && selectedChoreId === id && !ownerRole) card.classList.add("selected");
    });
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

function showWait() {
    setPhase("wait");
    planWrap.hidden = true;
    gameView.hidden = true;
    pickConfirm.hidden = true;
    nameInput.hidden = true;
    meName.hidden = true;
    meBadge.hidden = true;
    roomChip.hidden = true;
    countdown.hidden = true;
    showScores(false);
    selectedChore.hidden = true;
    clearActions();
    foldArmed = false;
    foldBtn.hidden = true;
    foldBtn.classList.remove("armed");
    setHint("wait");
}

function showPick() {
    setPhase("pick");
    planWrap.hidden = false;
    gameView.hidden = true;
    pickConfirm.hidden = false;
    pickConfirm.disabled = false;
    nameInput.hidden = false;
    meName.hidden = true;
    roomChip.hidden = true;
    countdown.hidden = true;
    showScores(false);
    selectedChoreId = "";
    pickLocked = false;
    selectedChore.hidden = true;
    clearActions();
    foldArmed = false;
    foldBtn.hidden = true;
    foldBtn.classList.remove("armed");
    paintChores();
    setHint("pick");
}

function showGame() {
    setPhase("play");
    planWrap.hidden = true;
    gameView.hidden = false;
    pickConfirm.hidden = true;
    nameInput.hidden = true;
    meName.hidden = false;
    roomChip.hidden = false;
    showScores(true);
    showSelect();
    clearActions();
    foldArmed = false;
    foldBtn.hidden = false;
    foldBtn.classList.remove("armed");
    foldBtn.textContent = t("fold");
    updateBadge();
}

function showDone(withScores) {
    setPhase("done");
    planWrap.hidden = false;
    gameView.hidden = true;
    pickConfirm.hidden = true;
    nameInput.hidden = true;
    meName.hidden = false;
    meBadge.hidden = true;
    roomChip.hidden = true;
    countdown.hidden = true;
    showScores(withScores);
    selectedChore.hidden = true;
    clearInterval(timer);
    clearActions();
    foldArmed = false;
    foldBtn.hidden = true;
    foldBtn.classList.remove("armed");
    oppBox.classList.remove("ready");
    paintChores();
    setHint("done");
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

function confirmPick() {
    if (phase === "pick") {
        if (!selectedChoreId) {
            setHint("pick");
            return;
        }
        pickLocked = true;
        pickConfirm.disabled = true;
        const typed = nameInput.value.trim().slice(0, 8);
        meName.textContent = typed || (myRole === "player1" ? "P1" : "P2");
        nameInput.hidden = true;
        meName.hidden = false;
        socket.emit("pickChore", { name: typed, chore: selectedChoreId });
        setHint("wait");
        return;
    }

    if (phase === "loser" && myRole === loserRole) {
        if (!selectedChoreId) {
            setHint("again");
            return;
        }
        pickConfirm.disabled = true;
        socket.emit("pickRemaining", selectedChoreId);
        setHint("wait");
    }
}

choreGrid.addEventListener("click", (event) => {
    const card = event.target.closest(".choreCard");
    if (!card) return;
    const id = card.dataset.chore;
    if (phase === "pick") {
        if (pickLocked) return;
        selectedChoreId = id;
        selectedChore.hidden = false;
        selectedChore.textContent = CHORES.find((c) => c.id === id).icon + " " + t(id);
        paintChores();
        return;
    }
    if (phase === "loser" && myRole === loserRole && !isTaken(id)) {
        selectedChoreId = id;
        selectedChore.hidden = false;
        selectedChore.textContent = CHORES.find((c) => c.id === id).icon + " " + t(id);
        paintChores();
    }
});

pickConfirm.addEventListener("click", confirmPick);

nameInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter") confirmPick();
});

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
    assignment = {};
    shownChore = "";
    renderScores(data.p1Score, data.p2Score);
    oppBox.classList.remove("ready");
    showPick();
});

socket.on("pickStatus", (data) => {
    names = data.names;
    renderNames();
    const oppReady = myRole === "player1" ? data.p2Ready : data.p1Ready;
    oppBox.classList.toggle("ready", !!oppReady);
});

socket.on("choreDone", (data) => {
    names = data.names;
    assignment = data.assignment;
    renderNames();
    showDone(!!data.contested);
});

socket.on("contestStart", (data) => {
    names = data.names;
    firstPlayer = data.firstPlayer;
    renderNames();
    renderScores(data.p1Score, data.p2Score);
    shownChore = data.chore || "";
    roomChip.textContent = shownChore ? t(shownChore) : "";
    mySelected = "";
    selectedAction = "";
    actionLocked = false;
    selectedChore.hidden = true;
    document.querySelectorAll(".hand").forEach((item) => item.classList.remove("active"));
    showGame();
    setHint("throw");
    startTimer();
});

socket.on("loserPick", (data) => {
    names = data.names;
    assignment = data.assignment;
    loserRole = data.loser;
    selectedChoreId = "";
    renderNames();
    renderScores(data.p1Score, data.p2Score);
    setPhase("loser");
    planWrap.hidden = false;
    gameView.hidden = true;
    nameInput.hidden = true;
    meName.hidden = false;
    meBadge.hidden = true;
    roomChip.hidden = true;
    countdown.hidden = true;
    showScores(true);
    clearInterval(timer);
    clearActions();
    foldArmed = false;
    foldBtn.hidden = true;
    foldBtn.classList.remove("armed");
    paintChores();
    if (myRole === data.loser) {
        pickConfirm.hidden = false;
        pickConfirm.disabled = false;
        selectedChore.hidden = true;
        setHint("again");
    } else {
        pickConfirm.hidden = true;
        selectedChore.hidden = true;
        setHint("wait");
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
    showGame();
    setHint(data.tie ? "replay" : "throw");
    startTimer();
});

socket.on("emoji", (data) => {
    const target = data.role === myRole ? meEmoji : oppEmoji;
    target.textContent = data.emoji;
});

socket.on("playerLeft", () => {
    clearInterval(timer);
    mySelected = "";
    selectedAction = "";
    actionLocked = false;
    selectedChoreId = "";
    pickLocked = false;
    meEmoji.textContent = "";
    oppEmoji.textContent = "";
    oppBox.classList.remove("ready");
    document.querySelectorAll(".hand").forEach((item) => item.classList.remove("active"));
    showWait();
    setHint("left");
    socket.emit("joinGame");
});

socket.on("observer", () => {
    window.location.href = "/observer/observer.html";
});
