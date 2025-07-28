from typing import Union
import uuid
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import json

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow any domain
    allow_credentials=True,
    allow_methods=["*"],  # Allow all HTTP methods
    allow_headers=["*"],  # Allow all headers
)

@app.get("/")
def read_root():
    return {"Congrats!": "The API works! Yay!"}


@app.get("/create")
def create():
    lobby_key = str(uuid.uuid4())
    print(f"New lobby created with key: {lobby_key}")
    return lobby_key