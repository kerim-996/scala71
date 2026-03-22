const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static("public"));

let rooms = {};

function createDeck() {
  const suits = ["H","D","C","S"];
  let deck = [];

  for (let d = 0; d < 2; d++) {
    for (let s of suits) {
      for (let v = 1; v <= 13; v++) {
        deck.push({ v, s });
      }
    }
  }
  return deck.sort(() => Math.random() - 0.5);
}

// --------- VALIDAZIONE COMBINAZIONI ---------

function isTris(cards) {
  return cards.every(c => c.v === cards[0].v);
}

function isScale(cards) {
  const sorted = [...cards].sort((a,b)=>a.v-b.v);
  const suit = sorted[0].s;

  return sorted.every((c,i)=>{
    if (c.s !== suit) return false;
    if (i === 0) return true;
    return c.v === sorted[i-1].v + 1;
  });
}

function calcPoints(cards) {
  let isScala = isScale(cards);
  let isTr = isTris(cards);

  if (!isScala && !isTr) return 0;

  let total = 0;

  cards.forEach(c => {
    if (c.v === 1) {
      total += isScala ? 1 : 10;
    } else if (c.v >= 11) {
      total += 10;
    } else {
      total += c.v;
    }
  });

  return total;
}

// ------------------------------------------

io.on("connection", socket => {

  socket.on("create_room", () => {
    const id = Math.random().toString(36).substring(2,7).toUpperCase();

    rooms[id] = {
      players: [],
      deck: [],
      discard: [],
      table: [],
      turn: 0,
      dealer: 0,
      lastOpen: 70
    };

    socket.join(id);
    socket.emit("room_created", id);
  });

  socket.on("join_room", id => {
    if (!rooms[id] || rooms[id].players.length >= 4) return;

    rooms[id].players.push({
      id: socket.id,
      hand: [],
      opened: false
    });

    socket.join(id);
    io.to(id).emit("players", rooms[id].players.length);
  });

  socket.on("start", id => {
    let g = rooms[id];
    g.deck = createDeck();

    g.players.forEach((p,i)=>{
      p.hand = g.deck.splice(0, i === g.dealer ? 15 : 14);
    });

    // scarto iniziale mazziere
    let dealer = g.players[g.dealer];
    g.discard.push(dealer.hand.pop());

    io.to(id).emit("state", g);
  });

  socket.on("draw", id => {
    let g = rooms[id];
    let p = g.players[g.turn];

    if (!p.opened) {
      p.hand.push(g.deck.pop());
    }

    io.to(id).emit("state", g);
  });

  socket.on("draw_discard", id => {
    let g = rooms[id];
    let p = g.players[g.turn];

    if (p.opened) {
      p.hand.push(g.discard.pop());
    }

    io.to(id).emit("state", g);
  });

  socket.on("open", ({id, cards}) => {
    let g = rooms[id];
    let p = g.players[g.turn];

    let selected = cards.map(i => p.hand[i]);

    let valid = isTris(selected) || isScale(selected);
    if (!valid) return;

    let pts = calcPoints(selected);

    if (pts > g.lastOpen) {
      p.opened = true;
      g.lastOpen = pts;

      // rimuove carte dalla mano
      p.hand = p.hand.filter((_,i)=>!cards.includes(i));

      g.table.push(selected);
    }

    io.to(id).emit("state", g);
  });

  socket.on("discard", ({id, index}) => {
    let g = rooms[id];
    let p = g.players[g.turn];

    g.discard.push(p.hand.splice(index,1)[0]);

    g.turn = (g.turn + 1) % g.players.length;

    io.to(id).emit("state", g);
  });

});

server.listen(3000, ()=>console.log("http://localhost:3000"));
