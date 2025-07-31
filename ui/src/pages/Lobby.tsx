import React, { useEffect, useState, useRef } from "react";
import axios from "axios";
import { useLocation } from "react-router-dom";

function Lobby() {
  const [newLobbyKey, setNewLobbyKey] = useState<string | null>(null);
  const [lobbyMessages, setLobbyMessages] = useState<string[]>([]);

  const initialRenderComplete = useRef<boolean>(false);
  const socketRef = useRef<WebSocket | null>(null);
  const displayNameRef = useRef<string | null>(null);

  const location = useLocation();

  //Create a lobby if the user comes in with the "create" operation
  //then send a request to the backend to create a lobby
  //and store the lobby key in the state
  useEffect(() => {
    if (initialRenderComplete.current || location.state?.operation !== "create")
      return;
    initialRenderComplete.current = true;
    const displayName = location.state?.display_name;
    console.log("Creating lobby with display name:", displayName);
    displayNameRef.current = displayName;
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

  // Join an existing lobby if the user comes in with a lobby key
  useEffect(() => {
    if (initialRenderComplete.current || location.state?.operation !== "join")
      return;
    initialRenderComplete.current = true;
    const lobbyKey = location.state.lobby_key;
    console.log("Joining lobby with key:", lobbyKey);
    displayNameRef.current = location.state.display_name;
    setNewLobbyKey(lobbyKey);
  });

  useEffect(() => {
    if (!newLobbyKey || !displayNameRef.current) return;
    const ws = new WebSocket(
      `ws://localhost:8000/lobby/${newLobbyKey}?display_name=${encodeURIComponent(
        displayNameRef.current
      )}`
    );
    socketRef.current = ws;

    ws.onopen = () => {
      console.log("WebSocket connection established.");
    };

    ws.onmessage = (event) => {
      const message = event.data;
      console.log("Message from server:", message);
      setLobbyMessages((lobbyMessages) => [...lobbyMessages, message]);
    };
  }, [newLobbyKey]);

  useEffect(() => {
    const disconnectWebSocket = () => {
      if (socketRef.current) {
        console.log("Closing WebSocket connection.");
        socketRef.current.close();
        socketRef.current = null;
        setNewLobbyKey(null);
      }
    };
    window.addEventListener("beforeunload", disconnectWebSocket);
    return () => {
      window.removeEventListener("beforeunload", disconnectWebSocket);
    };
  });

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
        <h2>Welcome {location.state?.display_name}!</h2>
        <p>Your Lobby Key: {newLobbyKey}</p>
        <p>Share this key with your friend to join the lobby.</p>
        <div
          className="modal-dialog-scrollable"
          style={{
            maxHeight: "50vh",
            backgroundColor: "gray",
            padding: "20px",
            borderRadius: "10px",
            width: "80%",
            overflow: "scroll",
          }}
        >
          {lobbyMessages.map((msg, index) => (
            <p key={index}>
              <b>{msg}</b>
            </p>
          ))}
        </div>
      </div>
    );
  };

  return <div>{newLobbyKey ? lobbyView() : spinner()}</div>;
}

export default Lobby;
