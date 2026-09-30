const express = require('express');
const http = require("http");

const app = express();
const port = process.env.PORT || 3000;

app.use(express.static('public'));

const server = http.createServer(app);

const { Server } = require('socket.io');
const io = new Server(server);

/* ================= GLOBAL ================= */

let players = {};
let observers = [];

let game = {};

let revealAckCount = 0;
let continueVotes = 0;

let firstPlayer = "player1";

let emojiStatus = {
    player1: "",
    player2: ""
};

const ROOM_IDS = ["master", "second", "small"];

function freshContest() {
    return {
        names: { player1: "P1", player2: "P2" },
        picks: { player1: null, player2: null },
        contested: null,
        loser: null,
        assignment: { master: null, second: null, small: null },
        phase: "pick"
    };
}

let roomContest = freshContest();

/* ================= STATE SYNC ================= */

function broadcastState(){

    io.emit("gameState",{

        stage:game.stage,
        firstPlayer:firstPlayer,

        p1Score:game.p1Score,
        p2Score:game.p2Score,

        p1Confirmed:game.p1Confirmed,
        p2Confirmed:game.p2Confirmed
    });
}

/* ================= INIT ================= */

function initGame() {

    players = {};
    observers = [];

    game = {

        stage: "waiting",

        p1Score: 100,
        p2Score: 100,

        p1Choice: null,
        p2Choice: null,

        p1Confirmed: false,
        p2Confirmed: false,

        p1UsedPower: false,
        p2UsedPower: false,

        p1Peeked: false,
        p2Peeked: false,
        p1Double: false,
        p2Double: false,

        p1Draw: false,
        p2Draw: false
    };

    revealAckCount = 0;
    continueVotes = 0;

    firstPlayer = "player1";

    emojiStatus = {
        player1:"",
        player2:""
    };

    roomContest = freshContest();

    console.log("=== FULL INIT ===");
}

initGame();

/* ================= ROUND RESET ================= */

function resetRound() {

    game.stage = "select";

    game.p1Choice = null;
    game.p2Choice = null;

    game.p1Confirmed = false;
    game.p2Confirmed = false;

    game.p1UsedPower = false;
    game.p2UsedPower = false;

    game.p1Peeked = false;
    game.p2Peeked = false;
    game.p1Double = false;
    game.p2Double = false;

    game.p1Draw = false;
    game.p2Draw = false;

    revealAckCount = 0;

    /* 先手轮换 */
    firstPlayer = firstPlayer === "player1" ? "player2" : "player1";

    console.log("=== NEW ROUND ===");

    broadcastState();
}

/* ================= END CHECK ================= */

function scoreEnded(){

    return (
        game.p1Score >= 150 ||
        game.p1Score <= 50 ||
        game.p2Score >= 150 ||
        game.p2Score <= 50
    );

}

function checkGameEnd(){

    if (!scoreEnded()) return false;

    settleContest();
    return true;

}

/* ================= CONNECTION ================= */

io.on("connection", (socket) => {

    console.log("Connected:", socket.id);

    /* ================= JOIN ================= */

    socket.on("joinGame", () => {

        if (players[socket.id]) return;

        if (Object.keys(players).length >= 2) {

            observers.push(socket.id);

            socket.emit("observer");

            socket.emit("gameState",{
                stage:game.stage,
                firstPlayer:firstPlayer,
                p1Score:game.p1Score,
                p2Score:game.p2Score
            });

            return;
        }

        const role = Object.keys(players).length === 0 ? "player1" : "player2";
        players[socket.id] = role;

        console.log(socket.id, "joined as", role);

        if (Object.keys(players).length === 2) {

            game.stage = "pickRoom";
            roomContest.phase = "pick";

            for (let id in players) {

                io.to(id).emit("startGame", {
                    role: players[id],
                    p1Score: game.p1Score,
                    p2Score: game.p2Score,
                    firstPlayer:firstPlayer
                });

            }

            broadcastState();
        }

    });

    /* ================= ROOMS ================= */

    socket.on("pickRoom", (payload) => {

        const role = players[socket.id];
        if (!role || game.stage !== "pickRoom") return;

        const room = payload && payload.room;
        if (!ROOM_IDS.includes(room)) return;

        const fallback = role === "player1" ? "P1" : "P2";
        const raw = payload.name == null ? "" : String(payload.name);
        const name = raw.trim().slice(0, 8) || fallback;

        roomContest.names[role] = name;
        roomContest.picks[role] = room;

        io.emit("pickStatus", {
            p1Ready: !!roomContest.picks.player1,
            p2Ready: !!roomContest.picks.player2,
            names: {
                player1: roomContest.picks.player1 ? roomContest.names.player1 : "",
                player2: roomContest.picks.player2 ? roomContest.names.player2 : ""
            }
        });

        if (roomContest.picks.player1 && roomContest.picks.player2) {
            resolvePicks();
        }

    });

    socket.on("pickRemaining", (room) => {

        const role = players[socket.id];
        if (!role || game.stage !== "loserPick") return;
        if (role !== roomContest.loser) return;
        if (!ROOM_IDS.includes(room)) return;
        if (room === roomContest.contested) return;
        if (roomContest.assignment[room]) return;

        roomContest.assignment[room] = role;
        roomContest.phase = "done";
        game.stage = "done";

        io.emit("roomDone", roomSnapshot());

    });

    socket.on("surrender", () => {

        const role = players[socket.id];
        if (!role || roomContest.phase !== "play") return;

        const loser = role;
        const winner = role === "player1" ? "player2" : "player1";
        awardRoom(winner, loser);

    });

    /* ================= SELECT ================= */

    socket.on("select", (choice) => {

        const role = players[socket.id];
        
        if (role === "player1") game.p1Choice = choice;
        if (role === "player2") game.p2Choice = choice;

        broadcastState();
    });

    socket.on("confirm", () => {

        const role = players[socket.id];

        // 逻辑：如果是初始选择阶段
        if (game.stage === "select") {
            if (role === "player1") game.p1Confirmed = true;
            if (role === "player2") game.p2Confirmed = true;

            if (game.p1Confirmed && game.p2Confirmed) {
                game.stage = "p1Turn"; 
                io.emit("p1Turn"); 
                broadcastState();
            }
        } 
        // 关键逻辑：如果是修改手势后的确认
        else if (game.stage === "p1Change" || game.stage === "p2Change") {
            
            // 判断确认者是不是本轮的先手
            if (role === firstPlayer) {
                // 先手修改完 -> 轮到后手回合
                game.stage = "p2Turn"; 
                io.emit("p2Turn");
            } else {
                // 后手修改完 -> 进结算，打破死循环
                game.stage = "final";
                io.emit("finalStage");
            }
            
            broadcastState();
        }
    });

    /* ================= FIRST PLAYER TURN ================= */

    socket.on("peep", () => {

        const role = players[socket.id];
        if(role !== firstPlayer) return;
        
        if(role === "player1") {
            game.p1UsedPower = true;
            game.p1Peeked = true;
            socket.emit("peekResult", game.p2Choice);
        } else {
            game.p2UsedPower = true;
            game.p2Peeked = true;
            socket.emit("peekResult", game.p1Choice);
        }

        // 修正：先手触发的统一为 p1Change
        game.stage = "p1Change"; 

        broadcastState();
    });

    /* ================= SECOND PLAYER TURN ================= */

    socket.on("checkPeeping", () => {

        const role = players[socket.id];
        if(role === firstPlayer) return;

        if(role === "player1") game.p1UsedPower = true; else game.p2UsedPower = true;

        const opponentPeeked = (firstPlayer === "player1") ? game.p1Peeked : game.p2Peeked;
        socket.emit("peepStatus", opponentPeeked);

        // 修正：后手触发的统一为 p2Change，无论他是 P1 还是 P2
        game.stage = "p2Change";

        broadcastState();
    });

    socket.on("checkLose", () => {

        const role = players[socket.id];
        if(role === firstPlayer) return;

        if(role === "player1") game.p1UsedPower = true; else game.p2UsedPower = true;

        const result = judge(game.p1Choice, game.p2Choice);

        // 后手是否输了
        const lose = (role === "player1" && result === "p2") || (role === "player2" && result === "p1");

        socket.emit("loseStatus", lose);

        // 修正：后手触发的统一为 p2Change，无论他是 P1 还是 P2
        game.stage = "p2Change";

        broadcastState();
    });

    /* ================= DOUBLE ================= */

    socket.on("p1Double",()=>{

        const role = players[socket.id];
        if(role !== firstPlayer) return;

        if(role === "player1") {
            game.p1UsedPower = true;
            game.p1Double = true;
        } else {
            game.p2UsedPower = true;
            game.p2Double = true;
        }

        game.stage = "p2Turn";
        io.emit("p2Turn");
        broadcastState();
    });

    socket.on("p2Double",()=>{

        const role = players[socket.id];
        if(role === firstPlayer) return;

        if(role === "player1") {
            game.p1UsedPower = true;
            game.p1Double = true;
        } else {
            game.p2UsedPower = true;
            game.p2Double = true;
        }

        game.stage="final";
        io.emit("finalStage");

        broadcastState();
    });

    /* ================= FINAL ================= */

    socket.on("proposeDraw", () => {

        if (game.stage !== "final") return;

        const role = players[socket.id];

        if (role === "player1") game.p1Draw = true;
        if (role === "player2") game.p2Draw = true;

        if (game.p1Draw && game.p2Draw) {
            game.stage = "reveal";
            applyDraw();
        }

        broadcastState();
    });

    socket.on("reveal", () => {

        if (game.stage !== "final") return;

        game.stage = "reveal";
        applyResult();
        broadcastState();

    });

    /* ================= EMOJI ================= */

    socket.on("emoji",(emoji)=>{

        const role = players[socket.id];

        if(role === "player1") emojiStatus.player1 = emoji;
        if(role === "player2") emojiStatus.player2 = emoji;

        io.emit("emoji",{
            role:role,
            emoji:emoji
        });

    });

    /* ================= ACK ================= */

    socket.on("ackReveal",()=>{

        revealAckCount++;

        if(revealAckCount >= 2){

            if(!checkGameEnd()){

                resetRound();

                io.emit("startNextRound",{
                    p1Score:game.p1Score,
                    p2Score:game.p2Score,
                    firstPlayer:firstPlayer
                });

            }

        }

    });

    /* ================= CONTINUE ================= */

    socket.on("continueGame",()=>{

        continueVotes++;

        if(continueVotes >= 2){

            continueVotes = 0;

            resetRound();

            io.emit("startNextRound",{
                p1Score:game.p1Score,
                p2Score:game.p2Score,
                firstPlayer:firstPlayer
            });

        }

    });

    /* ================= DISCONNECT ================= */

    socket.on("disconnect",()=>{

        console.log("Disconnected:", socket.id);

        if(players[socket.id]){

            delete players[socket.id];

            console.log("Player disconnected, resetting game");

            initGame();

            io.emit("playerLeft");

        }

    });

});

/* ================= ROOMS ================= */

function roomSnapshot() {

    return {
        names: roomContest.names,
        assignment: roomContest.assignment,
        contested: roomContest.contested,
        loser: roomContest.loser
    };

}

function resolvePicks() {

    const a = roomContest.picks.player1;
    const b = roomContest.picks.player2;

    if (a !== b) {

        roomContest.assignment[a] = "player1";
        roomContest.assignment[b] = "player2";
        roomContest.phase = "done";
        game.stage = "done";
        io.emit("roomDone", roomSnapshot());
        return;

    }

    roomContest.contested = a;
    roomContest.phase = "play";
    game.stage = "select";

    io.emit("contestStart", {
        room: a,
        names: roomContest.names,
        firstPlayer: firstPlayer,
        p1Score: game.p1Score,
        p2Score: game.p2Score
    });

    broadcastState();

}

function awardRoom(winner, loser) {

    if (roomContest.contested) {
        roomContest.assignment[roomContest.contested] = winner;
    }

    roomContest.loser = loser;
    roomContest.phase = "loserPick";
    game.stage = "loserPick";

    io.emit("loserPick", {
        winner: winner,
        loser: loser,
        contested: roomContest.contested,
        names: roomContest.names,
        assignment: roomContest.assignment,
        p1Score: game.p1Score,
        p2Score: game.p2Score
    });

}

function settleContest() {

    if (game.p1Score === game.p2Score) {

        resetRound();

        io.emit("startNextRound", {
            p1Score: game.p1Score,
            p2Score: game.p2Score,
            firstPlayer: firstPlayer,
            tie: true
        });

        return;

    }

    const winner = game.p1Score > game.p2Score ? "player1" : "player2";
    const loser = winner === "player1" ? "player2" : "player1";
    awardRoom(winner, loser);

}

/* ================= RULES ================= */

function judge(a, b) {

    if (a === b) return "draw";

    if (
        (a === "rock" && b === "scissors") ||
        (a === "paper" && b === "rock") ||
        (a === "scissors" && b === "paper")
    ) return "p1";

    return "p2";
}

function applyDraw() {

    game.p1Score += 5;
    game.p2Score += 5;

    io.emit("revealResult", {
        p1: game.p1Choice,
        p2: game.p2Choice,
        winner: "draw",
        p1Score: game.p1Score,
        p2Score: game.p2Score
    });
}

function applyResult() {

    const result = judge(game.p1Choice, game.p2Choice);

    let p1Gain = 0;
    let p2Gain = 0;

    if (result === "draw") {
        p1Gain = 5;
        p2Gain = 5;
    }

    if (result === "p1") {
        p1Gain = game.p1Double ? 20 : 10;
        p2Gain = game.p2Peeked ? -20 : -10;
    }

    if (result === "p2") {
        p2Gain = game.p2Double ? 20 : 10;
        p1Gain = game.p1Peeked ? -20 : -10;
    }

    game.p1Score += p1Gain;
    game.p2Score += p2Gain;

    io.emit("revealResult", {
        p1: game.p1Choice,
        p2: game.p2Choice,
        winner: result,
        p1Score: game.p1Score,
        p2Score: game.p2Score
    });
}

module.exports = server;

if (!process.env.VERCEL) {
    server.listen(port, function () {
        console.log("Server started at http://localhost:" + port);
    });
}