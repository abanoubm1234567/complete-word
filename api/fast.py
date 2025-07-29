from typing import List
import uuid
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from enum import Enum


app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow any domain
    allow_credentials=True,
    allow_methods=["*"],  # Allow all HTTP methods
    allow_headers=["*"],  # Allow all headers
)

class LobbyStatus(str, Enum):
    WAITING = "waiting"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"

class Lobby:
    def __init__(self, key: str, players: List[str], status: str):
        self.key = key
        self.players = players
        self.status = status

    def to_dict(self):
        return {"key": self.key}

lobbies = {}

@app.get("/")
def read_root():
    return {"Congrats!": "The API works! Yay!"}


@app.post("/create")
def create(display_name: str):
    lobby_key = str(uuid.uuid4())
    new_lobby = Lobby(key=lobby_key, players=[display_name], status="waiting")
    lobbies[lobby_key] = new_lobby
    return lobby_key

@app.get("/all_lobbies")
def get_all_lobbies():
    return [lobby.to_dict() for lobby in lobbies.values()]

@app.post("/clear_lobbies")
def clear_lobbies():
    lobbies.clear()