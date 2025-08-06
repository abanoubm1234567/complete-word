import React, { useState, useRef } from "react";
import "bootstrap/dist/css/bootstrap.min.css";
import { useNavigate } from "react-router-dom";
import "../styles/HomeScreen.css";
import axios from "axios";

function HomeScreen() {
  const joinLobbyKey = useRef<string>("");
  const displayName = useRef<string>("");

  const nav = useNavigate();

  const [displayNameError, setDisplayNameError] = useState<boolean>(false);
  const [emptyLobbyKeyError, setEmptyLobbyKeyError] = useState<boolean>(false);
  const [invalidLobbyKeyError, setInvalidLobbyKeyError] =
    useState<boolean>(false);

  const handleCreate = () => {
    if (emptyLobbyKeyError || invalidLobbyKeyError) {
      setEmptyLobbyKeyError(false);
      setInvalidLobbyKeyError(false);
    }
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

  const handleJoin = () => {
    let exitFunction = false;
    if (displayName.current === "") {
      setDisplayNameError(true);
      exitFunction = true;
    }
    if (joinLobbyKey.current === "") {
      exitFunction = true;
      setEmptyLobbyKeyError(true);
    }
    if (exitFunction) return;
    axios
      .post(
        "https://complete-word-api-510153365158.us-east4.run.app/join",
        null,
        {
          params: {
            lobby_key: joinLobbyKey.current,
            display_name: displayName.current,
          },
          headers: {
            "X-API-Key": process.env.REACT_APP_COMPLETE_WORD_API_KEY || "",
          },
        }
      )
      .then((response) => {
        if (response.data === true) {
          //console.log("joinLobbyKey.current:", joinLobbyKey.current); // Returns correct value
          nav("/lobby", {
            state: {
              operation: "join",
              lobby_key: joinLobbyKey.current,
              display_name: displayName.current,
            },
          });
        } else {
          setInvalidLobbyKeyError(true);
          return;
        }
      })
      .catch((error) => {
        console.error("Error joining lobby:", error);
      });
  };

  const handleDisplayNameChange = (value: string) => {
    if (displayNameError && value !== "") {
      setDisplayNameError(false);
    }
    displayName.current = value;
  };

  const handleLobbyKeyChange = (value: string) => {
    if (emptyLobbyKeyError && value !== "") {
      setEmptyLobbyKeyError(false);
    }

    if (invalidLobbyKeyError && value !== "") {
      setInvalidLobbyKeyError(false);
    }
    joinLobbyKey.current = value;
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
            className={
              "form-control" +
              (invalidLobbyKeyError || emptyLobbyKeyError ? " is-invalid" : "")
            }
            aria-label="Username"
            aria-describedby="basic-addon1"
            onChange={(e) => handleLobbyKeyChange(e.target.value)}
          />
        </div>
        {invalidLobbyKeyError ? (
          <p style={{ color: "red" }}>Invalid lobby key.</p>
        ) : null}
        {emptyLobbyKeyError ? (
          <p style={{ color: "red" }}>Lobby key cannot be empty.</p>
        ) : null}

        <button
          style={{ marginBottom: 20 }}
          className="btn btn-success"
          onClick={handleJoin}
        >
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
