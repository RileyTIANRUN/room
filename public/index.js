function applyLanguage() {
    const english = currentLang() === "en";
    document.documentElement.lang = english ? "en" : "zh";
    document.body.classList.toggle("en", english);
    document.title = t("title");
    document.getElementById("title").textContent = t("title");
    document.getElementById("startBtn").textContent = t("enter");
    const langBtn = document.getElementById("langBtn");
    langBtn.textContent = english ? "中" : "EN";
    langBtn.setAttribute("aria-label", t("switchLang"));
}

document.getElementById("langBtn").onclick = () => {
    toggleLang();
    applyLanguage();
};

document.getElementById("startBtn").onclick = () => {
    window.location.href = "player/player.html";
};

applyLanguage();

