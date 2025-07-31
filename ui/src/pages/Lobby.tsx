import React, { useEffect, useState, useRef } from "react";
import axios from "axios";
import { useLocation, useNavigate } from "react-router-dom";

function Lobby() {
  const [newLobbyKey, setNewLobbyKey] = useState<string | null>(null);
  const [lobbyMessages, setLobbyMessages] = useState<string[]>([]);
  const [gameCanStart, setGameCanStart] = useState<boolean>(false);

  const initialRenderComplete = useRef<boolean>(false);
  const socketRef = useRef<WebSocket | null>(null);
  const displayNameRef = useRef<string | null>(null);

  const location = useLocation();

  const nav = useNavigate();

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
      const message = JSON.parse(event.data);
      console.log("Message from server:", message);
      switch (message.type) {
        case 1: // INFO
          break;
        case 2: // COMM
          setLobbyMessages((lobbyMessages) => [
            ...lobbyMessages,
            message.player + ": " + message.message,
          ]);
          break;
        case 3: // BROADCAST
          setLobbyMessages((lobbyMessages) => [
            ...lobbyMessages,
            "LOBBY: " + message.message,
          ]);
          break;
        default:
          console.warn("Unknown message type:", message.type);
      }
    };
  }, [newLobbyKey]);

  useEffect(() => {
    const disconnectWebSocket = () => {
      if (socketRef.current) {
        localStorage.setItem("wasInLobby", "true");
      }
    };
    window.addEventListener("beforeunload", disconnectWebSocket);
    return () => {
      window.removeEventListener("beforeunload", disconnectWebSocket);
    };
  }, []);

  useEffect(() => {
    const wasInLobby = localStorage.getItem("wasInLobby");
    if (wasInLobby) {
      localStorage.removeItem("wasInLobby");
      console.log("Closing WebSocket connection.");
      if (socketRef.current) {
        socketRef.current.close();
        socketRef.current = null;
      }
      setNewLobbyKey(null);
      nav("/");
    }
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

  const handleStart = () => {
    alert("Game is starting!");
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
        <div className="input-group mb-3" style={{ width: "80%", marginTop: 5 }}>
          <span className="input-group-text" id="basic-addon1">
            Message
          </span>
          <input
            type="text"
            className="form-control"
            aria-label="Message"
            aria-describedby="basic-addon1"
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                if (socketRef.current) {
                  socketRef.current.send(
                    JSON.stringify({
                      type: 2,
                      message: e.currentTarget.value,
                    })
                  );
                  e.currentTarget.value = "";
                }
              }
            }}
          />
          {gameCanStart ? (
            <button
              style={{ marginBottom: 20, marginTop: 20 }}
              className="btn btn-success"
              onClick={handleStart}
            >
              Start
            </button>
          ) : null}
        </div>
      </div>
    );
  };

  return <div>{newLobbyKey ? lobbyView() : spinner()}</div>;
}

export default Lobby;
