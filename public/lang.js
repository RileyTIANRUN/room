const CHORES = [
    { id: "dishes", icon: "🍽️" },
    { id: "mop", icon: "🧹" },
    { id: "trash", icon: "🗑️" },
    { id: "sweep", icon: "🧽" },
    { id: "package", icon: "📦" }
];

const STR = {
    zh: {
        title: "家务分",
        enter: "进入",
        name: "名字",
        them: "对方",
        ok: "确定",
        fold: "认输",
        pick: "选家务",
        wait: "等待",
        throw: "出拳",
        turn: "你的回合",
        choose: "选一个",
        again: "再选",
        done: "分好了",
        replay: "平分再战",
        show: "开牌",
        peeked: "被看了",
        hidden: "没被看",
        losing: "会输",
        safe: "不会输",
        left: "对方离开",
        win: "胜",
        lose: "负",
        drawWord: "平",
        first: "先",
        later: "后",
        peep: "偷看",
        double: "加倍",
        peekedQ: "查偷看",
        losingQ: "查输赢",
        draw: "平局",
        rules: "规则",
        close: "关闭",
        plan: "家务",
        dishes: "刷碗",
        mop: "拖地",
        trash: "扔垃圾",
        sweep: "扫地",
        package: "拿快递",
        switchLang: "English",
        r1: "两人各选一个家务。不同就直接分配。相同就进入对战。",
        r2: "赢的人做那个家务，输的人从剩下的家务里再选。",
        r3: "100 分起。先手每回合轮换。",
        r4: "先暗选出拳。",
        r5: "先手可以偷看或加倍。偷看后可以改拳。",
        r6: "后手可以查偷看、查输赢或加倍。查看后可以改拳。",
        r7: "之后可以一起认平，或开牌。",
        r8: "赢 +10。加倍后再赢 +20。输 −10。偷看了还输 −20。平局各 +5。",
        r9: "有人到 150，或到 50 及以下，对战结束。分高者做家务。平分再打。"
    },
    en: {
        title: "Chores",
        enter: "Enter",
        name: "Name",
        them: "Them",
        ok: "OK",
        fold: "Fold",
        pick: "Pick",
        wait: "Waiting",
        throw: "Throw",
        turn: "Your turn",
        choose: "Pick",
        again: "Pick",
        done: "Done",
        replay: "Replay",
        show: "Show",
        peeked: "Peeked",
        hidden: "Hidden",
        losing: "Losing",
        safe: "Safe",
        left: "Left",
        win: "Win",
        lose: "Lose",
        drawWord: "Draw",
        first: "1st",
        later: "2nd",
        peep: "Peek",
        double: "Double",
        peekedQ: "Peeked?",
        losingQ: "Losing?",
        draw: "Draw",
        rules: "Rules",
        close: "Close",
        plan: "Chores",
        dishes: "Dishes",
        mop: "Mop",
        trash: "Trash",
        sweep: "Sweep",
        package: "Package",
        switchLang: "中文",
        r1: "Each person picks a chore. Different chores are settled. The same chore starts a match.",
        r2: "The winner does that chore. The loser picks from what is left.",
        r3: "Both start at 100. The first move alternates.",
        r4: "Both choose a hand in secret.",
        r5: "The first player may peek or double. After a peek, they may change hands.",
        r6: "The second player may check a peek, check a loss, or double. After a check, they may change hands.",
        r7: "Then both may agree to a draw, or show the hands.",
        r8: "Win +10. A doubled win is +20. A loss is −10. A peeked loss is −20. A draw is +5 each.",
        r9: "At 150, or at 50 or below, the match ends. The higher score gets the chore. A tie plays on."
    }
};

function currentLang() {
    return localStorage.getItem("roomLang") === "en" ? "en" : "zh";
}

function t(key) {
    const pack = STR[currentLang()] || STR.zh;
    return pack[key] || STR.zh[key] || key;
}

function toggleLang() {
    localStorage.setItem("roomLang", currentLang() === "en" ? "zh" : "en");
}
