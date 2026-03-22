const socket = io();
let room;
let myHand = [];
let selected = [];

function create(){
  socket.emit("create_room");
}

function join(){
  room = document.getElementById("room").value;
  socket.emit("join_room", room);
}

function start(){
  socket.emit("start", room);
}

function draw(){
  socket.emit("draw", room);
}

function drawDiscard(){
  socket.emit("draw_discard", room);
}

socket.on("room_created", id=>{
  room = id;
  document.getElementById("info").innerText = "Stanza: "+id;
});

socket.on("state", g=>{
  let me = g.players.find(p=>p.id===socket.id);
  myHand = me.hand;

  document.getElementById("threshold").innerText =
    "Soglia: " + (g.lastOpen + 1);

  render();
});

function render(){
  const div = document.getElementById("hand");
  div.innerHTML = "";

  myHand.forEach((c,i)=>{
    let b = document.createElement("button");
    b.className = "card";
    b.innerText = c.v + c.s;

    b.onclick = ()=>{
      if (selected.includes(i)) {
        selected = selected.filter(x=>x!==i);
        b.classList.remove("selected");
      } else {
        selected.push(i);
        b.classList.add("selected");
      }
    };

    div.appendChild(b);
  });

  let openBtn = document.createElement("button");
  openBtn.innerText = "SCENDI";

  openBtn.onclick = ()=>{
    socket.emit("open", { id: room, cards: selected });
    selected = [];
  };

  div.appendChild(openBtn);
}
