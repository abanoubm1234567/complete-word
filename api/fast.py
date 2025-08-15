import uuid
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, Request, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import APIKeyHeader
from enum import Enum, IntEnum
import json
import random
import string
import enchant
import os
from dotenv import load_dotenv


app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],  # Allow all HTTP methods
    allow_headers=["Backend-API-Key"], 
)

load_dotenv()

API_KEY = os.getenv("REACT_APP_COMPLETE_WORD_API_KEY")

if not API_KEY:
    raise RuntimeError("API_KEY not set in environment")

class LobbyStatus(str, Enum):
    WAITING = "waiting"
    READY = "ready"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    ERROR = "error"

class MessageType(IntEnum):
    INFO =1,
    COMM = 2,
    BROADCAST = 3,
    SCORES = 4

class Lobby:
    def __init__(
        self, key: str,
        status="waiting",
        playersToSockets: dict = None,
        leader: str = None,
        round: int = 1,
        firstLetter: str = None,
        lastLetter: str = None,
        playersToScores: dict = None,
        numSkips: int = 0,
        weightedWords: bool = True,
        numRounds: int = 7
        ):

        self.key = key
        self.playersToSockets = playersToSockets or {}
        self.status = status
        self.leader = leader
        self.round = round
        self.firstLetter = firstLetter
        self.lastLetter = lastLetter
        self.playersToScores = playersToScores or {}
        self.numSkips = numSkips
        self.weightedWords = weightedWords
        self.numRounds = numRounds

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
                        "lastLetter": self.lastLetter,
                        "scores": self.playersToScores,
                        "numSkips": self.numSkips,
                        "numRounds": self.numRounds
                    })
                except Exception as e:
                    print(f"Error sending: {e}")

    def disconnect(self, display_name: str):
        self.playersToSockets.pop(display_name, None)
        self.playersToScores.pop(display_name, None)

    def is_empty(self) -> bool:
        for _, ws in self.playersToSockets.items():
            if ws is not None:
                return False
        return True

    def to_dict(self):
        return {
            "key": self.key,
            "playersToSockets": str(self.playersToSockets),
            "playersToScores": self.playersToScores,
            "status": self.status,
            "leader": self.leader,
            "weightedWords": self.weightedWords
        }
lobbies = {}

async def check_api_key(api_key: str):
    if api_key == API_KEY:
        print('verified')
        return api_key
    else:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Could not validate API Key",
        )

lobbyNumTracker = 0

@app.get("/")
async def read_root(request: Request):
    api_key = request.headers.get('Backend-API-Key')
    await check_api_key(api_key)
    result = []
    for lobby in lobbies.values():
        result.append(lobby.to_dict())
    return result


@app.post("/create")
async def create(display_name: str, request: Request):
    api_key = request.headers.get('Backend-API-Key')
    await check_api_key(api_key)
    global lobbyNumTracker
    lobby_key = lobbyNumTracker
    lobbyNumTracker += 1
    print(f"Reserved lobby key number {lobby_key}")
    return lobby_key

@app.post("/join")
async def join(lobby_key: str, display_name: str, request: Request):
    api_key = request.headers.get('Backend-API-Key')
    await check_api_key(api_key)
    if lobby_key not in lobbies:
        return False
    lobby = lobbies[lobby_key]
    if display_name in lobby.playersToSockets:
        lobby.playersToSockets[display_name+"(2)"] = None
    else:
        lobby.playersToSockets[display_name] = None
    lobby.playersToScores[display_name] = 0
    print(f"{display_name} joined lobby {lobby_key}. Current players: {str(lobby.playersToSockets)}")
    return True

@app.websocket("/lobby/{lobby_key}")
async def websocket_endpoint(websocket: WebSocket, lobby_key: str):

    bad_start = {"x", "z", "j", "v", "y", "k"}
    bad_end = {"q", "j", "v", "x", "z", "c", "u", "i"}

    def is_valid_word(word: str, first_letter: str, last_letter: str) -> bool:
        if(len(word)> 1 and word.isalpha() and word[0].lower()==first_letter and word[-1].lower()==last_letter):
            d = enchant.Dict("en_US")
            return d.check(word)
        print('inavlid word')
        return False
    await websocket.accept()
    display_name = websocket.query_params.get("display_name")
    weighted_words = True if websocket.query_params.get("weighted_words") == "true" else False
    numRounds = websocket.query_params.get("num_rounds")
    if not display_name:
        print("no display name")
        await websocket.close()
        return

    lobby = lobbies.get(lobby_key)
    if not lobby:
        print(f"Lobby {lobby_key} does not exist.")
        lobbies[lobby_key] = Lobby(key=lobby_key)
        lobby = lobbies[lobby_key]
        lobby.playersToSockets[display_name] = None
        lobby.playersToScores[display_name] = 0
        lobby.leader = display_name
        lobby.weightedWords = weighted_words
        lobby.numRounds = numRounds
        print("weighted_words from frontend: ", weighted_words)
        print(f"Created lobby with key: {lobby_key}")

    lobby.playersToSockets[display_name] = websocket
    print(f"{display_name} connected to lobby {lobby_key}. Current players: {str(lobby.playersToSockets)}")
    await lobby.broadcast(f"{display_name} has joined.", None, MessageType.BROADCAST)

    if len(lobby.playersToSockets) < 2:
        lobby.status = LobbyStatus.WAITING
        await lobby.broadcast("Waiting for more players to join...", None, MessageType.INFO)
    else:
        lobby.status = LobbyStatus.READY
        await lobby.broadcast("Game is ready to start!", None, MessageType.INFO)
        await lobby.broadcast("", None, MessageType.SCORES)

    try:
        while True:
            data = await websocket.receive_text()
            #Is this a COMM or INFO message?
            #If it is a COMM, are we mid game?

            if (json.loads(data)["type"] == MessageType.INFO.value and json.loads(data)["message"] == "startGame"):
                if lobby.status == LobbyStatus.READY or lobby.status == LobbyStatus.COMPLETED:
                    for player in list(lobby.playersToScores.keys()):
                        lobby.playersToScores[player] = 0
                    await lobby.broadcast("", None, MessageType.SCORES)
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
                
                    await lobby.broadcast(f"{display_name}", None, MessageType.INFO)
                    lobby.playersToScores[display_name] += len(word) if lobby.weightedWords else 1
                    await lobby.broadcast("", None, MessageType.SCORES)
                    lobby.firstLetter = random.choice(string.ascii_lowercase)
                    while lobby.firstLetter in bad_start:
                        lobby.firstLetter = random.choice(string.ascii_lowercase)
                    lobby.lastLetter = random.choice(string.ascii_lowercase)
                    while lobby.lastLetter in bad_end:
                        lobby.lastLetter = random.choice(string.ascii_lowercase)
                    await lobby.broadcast(lobby.firstLetter+lobby.lastLetter, None, MessageType.INFO)

                    if lobby.round > int(lobby.numRounds):
                        lobby.status = LobbyStatus.COMPLETED
                        lobby.round = 1
                        await lobby.broadcast("Game completed!", None, MessageType.INFO)

                    else:
                        continue

            elif (json.loads(data)["type"] == MessageType.INFO.value and json.loads(data)["message"] == "skipWord"):
                lobby.numSkips += 1
                if lobby.numSkips < len(lobby.playersToSockets):
                    await lobby.broadcast("skip", None, MessageType.INFO)
                else:
                    lobby.numSkips = 0
                    lobby.round += 1
                    await lobby.broadcast("Word skipped!", None, MessageType.INFO)
                    lobby.firstLetter = random.choice(string.ascii_lowercase)
                    while lobby.firstLetter in bad_start:
                        lobby.firstLetter = random.choice(string.ascii_lowercase)
                    lobby.lastLetter = random.choice(string.ascii_lowercase)
                    while lobby.lastLetter in bad_end:
                        lobby.lastLetter = random.choice(string.ascii_lowercase)
                    await lobby.broadcast(lobby.firstLetter+lobby.lastLetter, None, MessageType.INFO)

                    if lobby.round > 7:
                        lobby.status = LobbyStatus.COMPLETED
                        lobby.round = 1
                        await lobby.broadcast("Game completed!", None, MessageType.INFO)

                    else:
                        continue



    except WebSocketDisconnect:
        lobby.disconnect(display_name)

        # Safely remove players with None WebSocket
        to_remove = [player for player, ws in lobby.playersToSockets.items() if ws is None]
        for player in to_remove:
            del lobby.playersToSockets[player]
            del lobby.playersToScores[player]

        await lobby.broadcast(f"{display_name} has disconnected.", None, MessageType.BROADCAST)
        await lobby.broadcast("", None, MessageType.SCORES)

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