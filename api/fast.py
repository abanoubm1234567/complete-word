import uuid
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from enum import Enum, IntEnum
import json
import random
import string
import enchant

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["https://abanoubm1234567.github.io/complete-word/"],
    allow_credentials=True,
    allow_methods=["*"],  # Allow all HTTP methods
    allow_headers=["*"],  # Allow all headers
)

class LobbyStatus(str, Enum):
    WAITING = "waiting"
    READY = "ready"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    ERROR = "error"

class MessageType(IntEnum):
    INFO =1, 
    COMM = 2, 
    BROADCAST = 3

class Lobby:
    def __init__(self, key: str,  status="waiting", playersToSockets: dict = None, leader: str = None, round: int = 1, firstLetter: str = None, lastLetter: str = None):
        self.key = key
        self.playersToSockets = playersToSockets or {}
        self.status = status
        self.leader = leader
        self.round = round
        self.firstLetter = firstLetter
        self.lastLetter = lastLetter

    async def broadcast(self, message: str, player: str = None, message_type: MessageType = MessageType.INFO):
        for _, ws in self.playersToSockets.items():
            if ws is not None:
                try:
                    await ws.send_json({
                        "message": message,
                        "player": player,
                        "status": self.status,
                        "type": message_type.value,
                        "leader": self.leader,
                        "round": self.round,
                        "firstLetter": self.firstLetter,
                        "lastLetter": self.lastLetter
                    })
                except Exception as e:
                    print(f"Error sending: {e}")

    def disconnect(self, display_name: str):
        self.playersToSockets.pop(display_name, None)

    def is_empty(self) -> bool:
        for _, ws in self.playersToSockets.items():
            if ws is not None:
                return False
        return True

    def to_dict(self):
        return {
            "key": self.key,
            "playersToSockets": str(self.playersToSockets),
        }
lobbies = {}
'''
# Read the lobbies from lobbies.json file

with open("lobbies.json", "r") as file:
    try:
        lobbies_data = json.load(file)
        for key, value in lobbies_data.items():
            lobby = Lobby(key=key, players=value["players"], status=value["status"])#
            lobbies[key] = lobby
    except json.JSONDecodeError:
        print("Error decoding JSON from lobbies.json. Starting with an empty lobby list.")

@app.on_event("shutdown")
def save_on_shutdown():
    with open("lobbies.json", "w") as f:
        json.dump(lobbies, f, indent=2)
    print("Saved lobbies to lobbies.json")
'''

@app.get("/")
def read_root():
    result = []
    for lobby in lobbies.values():
        result.append(lobby.to_dict())
    return result


@app.post("/create")
async def create(display_name: str):
    lobby_key = uuid.uuid4().hex
    new_lobby = Lobby(key=lobby_key)
    lobbies[lobby_key] = new_lobby
    lobbies[lobby_key].playersToSockets[display_name] = None
    lobbies[lobby_key].leader = display_name
    print(f"Created lobby with key: {lobby_key}")
    return lobby_key

@app.post("/join")
async def join(lobby_key: str, display_name: str):
    if lobby_key not in lobbies:
        return False
    lobby = lobbies[lobby_key]
    if display_name in lobby.playersToSockets:
        lobby.playersToSockets[display_name+"2"] = None
    else:
        lobby.playersToSockets[display_name] = None
    print(f"{display_name} joined lobby {lobby_key}. Current players: {str(lobby.playersToSockets)}")
    return True

@app.websocket("/lobby/{lobby_key}")
async def websocket_endpoint(websocket: WebSocket, lobby_key: str):
    bad_start = {"x", "q", "z", "j", "v", "y", "k"}
    bad_end = {"q", "j", "v", "x", "z", "c"}

    def is_valid_word(word: str, first_letter: str, last_letter: str) -> bool:
        if(len(word)> 1 and word.isalpha() and word[0]==first_letter and word[-1]==last_letter):
            d = enchant.Dict("en_US")
            return d.check(word)
        print('inavlid word')
        return False

    await websocket.accept()
    display_name = websocket.query_params.get("display_name")
    if not display_name:
        await websocket.close()
        return

    lobby = lobbies.get(lobby_key)
    if not lobby:
        await websocket.close()
        return
    

    lobby.playersToSockets[display_name] = websocket
    print(f"{display_name} connected to lobby {lobby_key}. Current players: {str(lobby.playersToSockets)}")
    await lobby.broadcast(f"{display_name} has joined.", None, MessageType.BROADCAST)

    if len(lobby.playersToSockets) < 2:
        lobby.status = LobbyStatus.WAITING
        await lobby.broadcast("Waiting for more players to join...", None, MessageType.INFO)
    else:
        lobby.status = LobbyStatus.READY
        await lobby.broadcast("Game is ready to start!", None, MessageType.INFO)

    try:
        while True:
            data = await websocket.receive_text()
            #Is this a COMM or INFO message?
            #If it is a COMM, are we mid game?

            if (json.loads(data)["type"] == MessageType.INFO.value and json.loads(data)["message"] == "startGame"):
                if lobby.status == LobbyStatus.READY or lobby.status == LobbyStatus.COMPLETED:
                    lobby.status = LobbyStatus.IN_PROGRESS
                    await lobby.broadcast("Game is starting!", None, MessageType.INFO)
                    lobby.firstLetter = random.choice(string.ascii_lowercase)
                    while lobby.firstLetter in bad_start:
                        lobby.firstLetter = random.choice(string.ascii_lowercase)
                    lobby.lastLetter = random.choice(string.ascii_lowercase)
                    while lobby.lastLetter in bad_end:
                        lobby.lastLetter = random.choice(string.ascii_lowercase)
                    await lobby.broadcast(lobby.firstLetter+lobby.lastLetter, None, MessageType.INFO)
                
            elif (json.loads(data)["type"] == MessageType.COMM.value):
                if (json.loads(data)["message"] ==""):
                    continue
                await lobby.broadcast(json.loads(data)["message"], display_name, MessageType.COMM)
                if (lobby.status == LobbyStatus.IN_PROGRESS):
                    # Check if the word is valid
                    word = json.loads(data)["message"]
                    print("word: ",word)
                    
                    if not is_valid_word(word, lobby.firstLetter, lobby.lastLetter):
                        continue
                    lobby.round += 1
                    if lobby.round > 5:
                        lobby.status = LobbyStatus.COMPLETED
                        lobby.round = 1
                        await lobby.broadcast("Game completed!", None, MessageType.INFO)
                        
                    else:
                        
                        await lobby.broadcast(f"{display_name}", None, MessageType.INFO)
                        lobby.firstLetter = random.choice(string.ascii_lowercase)
                        while lobby.firstLetter in bad_start:
                            lobby.firstLetter = random.choice(string.ascii_lowercase)
                        lobby.lastLetter = random.choice(string.ascii_lowercase)
                        while lobby.lastLetter in bad_end:
                            lobby.lastLetter = random.choice(string.ascii_lowercase)
                        await lobby.broadcast(lobby.firstLetter+lobby.lastLetter, None, MessageType.INFO)
                        
                    
    except WebSocketDisconnect:
        lobby.disconnect(display_name)

        # Safely remove players with None WebSocket
        to_remove = [player for player, ws in lobby.playersToSockets.items() if ws is None]
        for player in to_remove:
            del lobby.playersToSockets[player]

        await lobby.broadcast(f"{display_name} has disconnected.", None, MessageType.BROADCAST)

        if lobby.leader not in lobby.playersToSockets:
            lobby.status = LobbyStatus.ERROR
            await lobby.broadcast("Leader disconnected. Deleting lobby...", None, MessageType.BROADCAST)
            await lobby.broadcast("", None, MessageType.INFO)

        if len(lobby.playersToSockets) < 2:
            lobby.status = LobbyStatus.WAITING
            await lobby.broadcast("Waiting for more players to join...", None, MessageType.INFO)

        if lobby.is_empty():
            del lobbies[lobby_key]
            print(f"Lobby {lobby_key} deleted.")
