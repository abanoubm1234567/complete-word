import React, { useEffect, useState, useRef } from "react";
import axios from "axios";
import { useLocation } from "react-router-dom";

function Lobby() {
  const [newLobbyKey, setNewLobbyKey] = useState<string | null>(null);
  const initialRenderComplete = useRef<boolean>(false);

  const location = useLocation();

  //Create a lobby if the user comes in with the "create" operation
  useEffect(() => {
    if (initialRenderComplete.current || location.state?.operation !== "create")
      return;
    initialRenderComplete.current = true;
    const displayName = location.state?.display_name;
    axios
      .post("http://127.0.0.1:8000/create", null, {
        params: {
          display_name: displayName,
        },
      })
      .then((response) => {
        if (response.data) {
          setNewLobbyKey(response.data);
        }
      })
      .catch((error) => {
        console.error("Error creating lobby:", error);
        setNewLobbyKey("Error creating lobby. Please try again.");
      });
  }, []);

  const spinner = () => {
    return (
      <div
        className="d-flex justify-content-center"
        style={{
          marginTop: "20vh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
        }}
      >
        <p className="text-center">Creating Lobby...</p>
        <div className="spinner-border" role="status"></div>
      </div>
    );
  };

  const lobbyView = () => {
    return (
      <div
        className="d-flex justify-content-center"
        style={{
          marginTop: "20vh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
        }}
      >
        <h2>Lobby Created Successfully!</h2>
        <p>Your Lobby Key: {newLobbyKey}</p>
        <p>Share this key with your friend to join the lobby.</p>
        <p>Lobby Status: </p>
      </div>
    );
  };

  return <div>{newLobbyKey ? lobbyView() : spinner()}</div>;
}

export default Lobby;
