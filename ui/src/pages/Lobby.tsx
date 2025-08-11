import React, { useEffect, useState, useRef } from "react";
import axios from "axios";
import { useLocation, useNavigate } from "react-router-dom";
import "../styles/Lobby.css";

function Lobby() {
  const [newLobbyKey, setNewLobbyKey] = useState<string | null>(null);
  const [lobbyMessages, setLobbyMessages] = useState<string[]>([]);
  const [gameCanStart, setGameCanStart] = useState<boolean>(false);
  const [gameCanStartAgain, setGameCanStartAgain] = useState<boolean>(false);
  const [lobbyStatus, setLobbyStatus] = useState<string>(
    "Waiting for players..."
  );
  const [firstLetter, setFirstLetter] = useState<string>("");
  const [lastLetter, setLastLetter] = useState<string>("");
  const [round, setRound] = useState<number>(1);
  const [score, setScore] = useState<number>(0);
  const [roundComplete, setRoundComplete] = useState<boolean>(false);
  const [playerScores, setPlayerScores] = useState<Record<string, number>>({});

  const lobbyStatusRef = useRef<string>("waiting");
  const initialRenderComplete = useRef<boolean>(false);
  const socketRef = useRef<WebSocket | null>(null);
  const displayNameRef = useRef<string | null>(null);
  const lobbyLeaderRef = useRef<string | null>(null);

  const location = useLocation();

  const nav = useNavigate();

  const apiKey = process.env.REACT_APP_COMPLETE_WORD_API_KEY;

  //Create a lobby if the user comes in with the "create" operation
  //then send a request to the backend to create a lobby
  //and store the lobby key in the state
  useEffect(() => {
    const shouldCreateLobby = location.state?.operation === "create";
    const displayName = location.state?.display_name;

    if (!shouldCreateLobby || !displayName) return;

    console.log("Creating lobby with display name:", displayName);
    displayNameRef.current = displayName;

    axios
      .post(
        "https://complete-word-api-510153365158.us-east4.run.app/create",
        null,
        {
          params: {
            display_name: displayName,
          },
          headers: {
            "X-API-Key": apiKey || "",
          },
        }
      )
      .then((response) => {
        if (typeof response.data === "number") {
          console.log("Lobby created with key:", response.data);
          setTimeout(() => {
            setNewLobbyKey(response.data); // Delay to ensure backend state is ready
          }, 500);
        } else {
          console.error("Unexpected lobby key:", response.data);
          setNewLobbyKey(null);
        }
      })
      .catch((error) => {
        console.error("Error creating lobby:", error);
        setNewLobbyKey(null);
      });
  }, [location.state?.operation, location.state?.display_name, apiKey]);

  // Join an existing lobby if the user comes in with a lobby key
  useEffect(() => {
    if (
      initialRenderComplete.current ||
      location.state?.operation !== "join" ||
      !apiKey ||
      !location.state?.lobby_key ||
      !location.state?.display_name
    ) {
      return;
    }

    initialRenderComplete.current = true;
    const lobbyKey = location.state.lobby_key;
    displayNameRef.current = location.state.display_name;
    setNewLobbyKey(lobbyKey);
  }, [
    location.state.operation,
    location.state.lobby_key,
    location.state.display_name,
    apiKey,
  ]);

  useEffect(() => {
    if (!newLobbyKey || !displayNameRef.current) {
      return;
    }
    const ws = new WebSocket(
      `wss://complete-word-api-510153365158.us-east4.run.app/lobby/${newLobbyKey}` +
        `?display_name=${encodeURIComponent(
          displayNameRef.current
        )}&X-API-Key=${encodeURIComponent(apiKey || "")}`
    );

    socketRef.current = ws;

    ws.onopen = () => {
      console.log("WebSocket connection established.");
    };

    ws.onerror = (err) => {
      console.error("WebSocket error:", err);
    };

    ws.onclose = (event) => {
      console.log("WebSocket closed:", event.reason || "No reason provided");
    };

    ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        const { type, status } = message;

        if (!lobbyLeaderRef.current) {
          lobbyLeaderRef.current = message.leader;
        }

        switch (type) {
          case 1: // INFO
            switch (status) {
              case "ready":
                setScore(0);
                setGameCanStart(true);
                setLobbyStatus("Game is ready to start!");
                lobbyStatusRef.current = "ready";
                break;
              case "waiting":
                setGameCanStart(false);
                setLobbyStatus("Waiting for players...");
                lobbyStatusRef.current = "waiting";
                break;
              case "error":
                setGameCanStart(false);
                setLobbyStatus("Error: Leader disconnected. Lobby deleted.");
                lobbyStatusRef.current = "error";
                setNewLobbyKey(null);
                socketRef.current?.close();
                setTimeout(() => {
                  localStorage.removeItem("wasInLobby");
                  nav("/");
                }, 2000);
                break;
              case "in_progress":
                setGameCanStart(false);
                setGameCanStartAgain(false);
                setLobbyStatus("Game is in progress!");
                lobbyStatusRef.current = "in_progress";
                if (message.message.length === 2) {
                  if (message.round !== 1) {
                    setRoundComplete(true);
                    setTimeout(() => setRoundComplete(false), 1000);
                  }
                  setFirstLetter(message.message[0]);
                  setLastLetter(message.message[1]);
                }
                setRound(message.round);
                if (message.round === 1) setScore(0);

                if (message.message === displayNameRef.current) {
                  setScore((prev) => prev + 1);
                }
                break;
              case "completed":
                setLobbyStatus("Game completed!");
                lobbyStatusRef.current = "completed";
                setGameCanStartAgain(true);
                break;
              default:
                console.warn("Unknown lobby status:", status);
            }
            break;
          case 2: // COMM
            setLobbyMessages((prev) => [
              ...prev,
              `${message.player}: ${message.message}`,
            ]);
            break;
          case 3: // BROADCAST
            setLobbyMessages((prev) => [...prev, `LOBBY: ${message.message}`]);
            setPlayerScores(message.scores || {});
            break;
          case 4: // SCORE
            // Sort the scores by highest value first before setting state
            const scores = (message.scores as Record<string, number>) || {};
            const sortedEntries = Object.entries(scores).sort((a, b) => b[1] - a[1]);
            const sortedScores: Record<string, number> = {};
            sortedEntries.forEach(([player, score]) => {
              sortedScores[player] = score;
            });
            setPlayerScores(sortedScores);
            
            break;
          default:
            console.warn("Unknown message type:", type);
        }
      } catch (err) {
        console.error("Failed to parse WebSocket message", err);
      }
    };

    return () => {
      ws.close();
      console.log("WebSocket connection closed on cleanup.");
    };
  }, [newLobbyKey, nav, apiKey, displayNameRef]);

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
  }, [nav]);
  const chatBoxRef = useRef(null);

  useEffect(() => {
    if (chatBoxRef.current) {
      const chatBox = chatBoxRef.current as HTMLDivElement;
      chatBox.scrollTop = chatBox.scrollHeight; // Scroll to the bottom
    }
  }, [lobbyMessages]);

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
        <p className="text-center">Doing cool stuff...</p>
        <div className="spinner-border" role="status"></div>
      </div>
    );
  };

  const roundSpinner = () => {
    return (
      <div
        className="d-flex justify-content-center"
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
        }}
      >
        <p className="text-center">{round === 8 ? "Concluding game..." : "Starting next round..."}</p>
        <div className="spinner-border" role="status"></div>
      </div>
    );
  };

  const handleStart = () => {
    if (!socketRef.current) return;
    setScore(0);
    setRound(1);
    lobbyStatusRef.current = "in_progress";
    setLobbyStatus("Game is in progress!");
    setGameCanStart(false);
    setGameCanStartAgain(false);
    socketRef.current.send(
      JSON.stringify({
        type: 1,
        message: "startGame",
      })
    );
  };

  const gameView = () => (
    <div style={{ marginBottom: 20 }}>
      <div
        style={{
          fontSize: "1.5rem",
          fontWeight: "bold",
          color: "#38e6c5",
          marginBottom: 10,
        }}
      >
        Score: {score}
      </div>
      <p>Round {round}/7</p>
      <p>
        <span style={{ fontWeight: "bold" }}>First letter:</span> {firstLetter}
      </p>
      <p>
        <span style={{ fontWeight: "bold" }}>Last letter:</span> {lastLetter}
      </p>
      {roundComplete && (
        <div
          style={{
            background: "rgba(79, 140, 255, 0.12)",
            color: "#2d3a4a",
            padding: "8px 24px",
            borderRadius: "8px",
            fontWeight: "500",
            fontSize: "1.1rem",
            margin: "15px 0",
            boxShadow: "none",
            border: "1px solid #b3d1ff",
            textAlign: "center",
            letterSpacing: "0.5px",
            pointerEvents: "none",
            userSelect: "none",
          }}
        >
          <span role="status" aria-live="polite">
            Next Round
          </span>
        </div>
      )}
    </div>
  );

  const lobbyView = () => {
    return (
      <div
        style={{
          display: "flex",
          flexDirection: "row",
          flexWrap: "wrap",
          justifyContent: "center",
          alignContent: "center",
        }}
      >
        <div
          className="d-flex justify-content-center"
          style={{
            flex: "1",
            maxWidth: "500px",
            marginTop: "5vh",
            minWidth: "300px",
            marginLeft: "10px",
            marginRight: "10px",
            flexDirection: "column",
            padding: "50px",
          }}
        >
          <h2>Leaderboard</h2>
          {/*Show player scores*/}
          <ul
            className="list-group"
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "flex-start",
            }}
          >
            {
            Object.entries(playerScores).map(([player, score]) => (
              <h3>
                {player}: {score}
              </h3>
            ))}
          </ul>
        </div>
        <div
          className="d-flex justify-content-center"
          style={{
            marginTop: "5vh",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            flex: "4",
            marginLeft: "10px",
            marginRight: "10px",
            minWidth: "400px",
          }}
        >
          <h2>Welcome {location.state?.display_name}!</h2>
          <p>Your Lobby Key: {newLobbyKey}</p>
          <p>Share this key with your friend to join the lobby.</p>
          <div style={{ display: "flex", flexDirection: "row" }}>
            <p style={{ marginRight: 4 }}>Lobby Status: </p>
            <p
              style={{
                color: lobbyStatusRef.current === "waiting" ? "red" : "green",
              }}
            >
              {lobbyStatus}
            </p>
          </div>
          {gameCanStartAgain &&
            Object.entries(playerScores).length > 0 &&
            displayNameRef.current === Object.entries(playerScores)[0][0] ? (
            <p style={{ color: "green", fontWeight: "bold" }}>Winner!</p>
          ) : null}
          {gameCanStartAgain && displayNameRef.current !== Object.entries(playerScores)[0][0] ? (
            <p style={{ color: "red", fontWeight: "bold" }}>Loser!</p>
          ) : null}
          {lobbyStatusRef.current === "in_progress" && !roundComplete
            ? gameView()
            : null}
          {roundComplete ? roundSpinner() : null}
          <div
            className="modal-dialog-scrollable chat-box"
            style={{
              height: "30vh",
              backgroundColor: "gray",
              padding: "20px",
              borderRadius: "10px",
              width: "80%",
              overflowY: "auto",
            }}
            ref={chatBoxRef}
          >
            {lobbyMessages.map((msg, index) => (
              <p key={index}>
                <b>{msg}</b>
              </p>
            ))}
          </div>
          <div
            className="input-group mb-3"
            style={{ width: "80%", marginTop: 5 }}
          >
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
          </div>

          {gameCanStart && displayNameRef.current === lobbyLeaderRef.current ? (
            <button
              style={{ marginBottom: 20, marginTop: 20 }}
              className="btn btn-success"
              onClick={handleStart}
            >
              Start
            </button>
          ) : null}
          {gameCanStartAgain &&
          displayNameRef.current === lobbyLeaderRef.current ? (
            <button
              style={{ marginBottom: 20, marginTop: 20 }}
              className="btn btn-success"
              onClick={handleStart}
            >
              Play Again
            </button>
          ) : null}
        </div>
      </div>
    );
  };

  return <div>{newLobbyKey ? lobbyView() : spinner()}</div>;
}

export default Lobby;
