import React, { useState, useRef } from "react";
import "bootstrap/dist/css/bootstrap.min.css";
import { useNavigate } from "react-router-dom";
import "../styles/HomeScreen.css";

function HomeScreen() {
  const joinLobbyKey = useRef<String>("");
  const displayName = useRef<String>("");

  const nav = useNavigate();

  const [displayNameError, setDisplayNameError] = useState<boolean>(false);

  const handleCreate = () => {
    if (displayName.current === "") {
      setDisplayNameError(true);
      return;
    }
    nav("/lobby", {
      state: {
        operation: "create",
        display_name: displayName.current,
      },
    });
  };

  const handleDisplayNameChange = (value: String) => {
    if (displayNameError && value !== "") {
      setDisplayNameError(false);
    }
    displayName.current = value;
  };

  return (
    <div
      className="HomeScreen"
      style={{
        backgroundColor: "grey",
        height: "100vh",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <h1 className="title">Word Race</h1>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
        }}
      >
        <div className="input-group mb-3" style={{ width: "75vw" }}>
          <span className="input-group-text" id="basic-addon1">
            Display Name
          </span>

          <input
            type="text"
            className={"form-control" + (displayNameError ? " is-invalid" : "")}
            aria-label="Username"
            aria-describedby="basic-addon1"
            onChange={(e) => handleDisplayNameChange(e.target.value)}
          />
        </div>
        {displayNameError ? (
          <p style={{ color: "red" }}>Display name cannot be empty.</p>
        ) : null}
        <div className="input-group mb-3" style={{ width: "75vw" }}>
          <span className="input-group-text" id="basic-addon1">
            Lobby Key
          </span>

          <input
            type="text"
            className="form-control"
            aria-label="Username"
            aria-describedby="basic-addon1"
            onChange={(e) => (joinLobbyKey.current = e.target.value)}
          />
        </div>

        <button style={{ marginBottom: 20 }} className="btn btn-success">
          Join
        </button>

        <button className="btn btn-primary" onClick={handleCreate}>
          Create New Lobby
        </button>
      </div>
    </div>
  );
}

export default HomeScreen;
