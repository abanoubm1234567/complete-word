import React, { useState, useRef } from "react";
import "bootstrap/dist/css/bootstrap.min.css";
import { useNavigate } from "react-router-dom";
import "../styles/HomeScreen.css";

function HomeScreen() {
  const joinLobbyKey = useRef("");
  const nav = useNavigate();

  const handleCreate = () => {
    nav("/create");
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

      <div className="input-group mb-3" style={{ width: "50%" }}>
        <span className="input-group-text" id="basic-addon1">
          Lobby Key:
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
  );
}

export default HomeScreen;
