import "../styles/HomeScreen.css";
import React, { useState } from "react";

function HomeScreen() {
  const [lobbyKey, setLobbyKey] = useState("");

  return (
    <div className="HomeScreen">
      <h1 className="title">Word Race</h1>

      <input
        type="text"
        className="lobbyKeyInput"
        placeholder="Enter lobby key"
        onChange={(e) => setLobbyKey(e.target.value)}
      ></input>

      <button className="button>">Join Exisiting</button>

      <p>or</p>
      <button className="button>">Create New Lobby</button>
    </div>
  );
}

export default HomeScreen;
