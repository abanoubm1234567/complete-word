import React, { useState, useRef } from "react";
import "bootstrap/dist/css/bootstrap.min.css";
import { useNavigate } from "react-router-dom";
import Collapse from "react-bootstrap/Collapse";
import { InputGroup, Form } from "react-bootstrap";
import "../styles/HomeScreen.css";
import axios from "axios";

function HomeScreen() {
  const joinLobbyKey = useRef<string>("");
  const displayName = useRef<string>("");
  const numberOfRoundsRef = useRef<Number>(7);

  const nav = useNavigate();

  const [displayNameError, setDisplayNameError] = useState<boolean>(false);
  const [emptyLobbyKeyError, setEmptyLobbyKeyError] = useState<boolean>(false);
  const [invalidLobbyKeyError, setInvalidLobbyKeyError] =
    useState<boolean>(false);
  const [joinLobbyMenuOpen, setJoinLobbyMenuOpen] = useState<boolean>(false);
  const [createLobbyMenuOpen, setCreateLobbyMenuOpen] =
    useState<boolean>(false);
  const [weightedWords, setWeightWords] = useState<boolean>(true);

  const apiUrl =
    process.env.REACT_APP_COMPLETE_WORD_API_URL || "http://localhost:8000";
  const apiKey = process.env.REACT_APP_COMPLETE_WORD_API_KEY;

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
        weightedWords: weightedWords
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
      .post(apiUrl + `/join`, null, {
        params: {
          lobby_key: joinLobbyKey.current,
          display_name: displayName.current,
        },
        headers: {
          "Backend-API-Key": apiKey,
        },
      })
      .then((response) => {
        if (response.data === true) {
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
        <p>
          <button
            className="btn btn-success"
            onClick={() => {
              setJoinLobbyMenuOpen(true);
              setCreateLobbyMenuOpen(false);
            }}
            style={{ marginRight: 10 }}
          >
            Join Lobby
          </button>

          <button
            className="btn btn-primary"
            onClick={() => {
              setCreateLobbyMenuOpen(true);
              setJoinLobbyMenuOpen(false);
            }}
            style={{ marginLeft: 10 }}
          >
            Create New Lobby
          </button>
        </p>
        <div className="row">
          <div className="col">
            <Collapse in={joinLobbyMenuOpen}>
              <div id="joinLobbyMenu" style={{ alignContent: "center" }}>
                <div className="input-group mb-3" style={{ width: "75vw" }}>
                  <span className="input-group-text" id="basic-addon1">
                    Display Name
                  </span>

                  <input
                    type="text"
                    className={
                      "form-control" + (displayNameError ? " is-invalid" : "")
                    }
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
                      (invalidLobbyKeyError || emptyLobbyKeyError
                        ? " is-invalid"
                        : "")
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
                  style={{}}
                  className="btn btn-success"
                  onClick={handleJoin}
                >
                  Join
                </button>
              </div>
            </Collapse>
            <Collapse in={createLobbyMenuOpen}>
              <div id="createLobbyMenu">
                <div className="input-group mb-3" style={{ width: "75vw" }}>
                  <span className="input-group-text" id="basic-addon1">
                    Display Name
                  </span>

                  <input
                    type="text"
                    className={
                      "form-control" + (displayNameError ? " is-invalid" : "")
                    }
                    aria-label="Username"
                    aria-describedby="basic-addon1"
                    onChange={(e) => handleDisplayNameChange(e.target.value)}
                  />
                </div>
                <div style={{ width: "100%" }}>
                  <InputGroup className="mb-3">
                    <InputGroup.Text>Weighted Words</InputGroup.Text>
                    <InputGroup.Checkbox
                      defaultChecked
                      onClick={() => {
                        setWeightWords(!weightedWords);
                      }}
                    />
                  </InputGroup>
                </div>
                <button className="btn btn-primary" onClick={handleCreate}>
                  Create
                </button>
              </div>
            </Collapse>
          </div>
        </div>
      </div>
    </div>
  );
}

export default HomeScreen;
