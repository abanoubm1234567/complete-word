import React, { useEffect, useState } from "react";
import axios from "axios";

function CreateLobby() {
  const [newLobbyKey, setNewLobbyKey] = useState<string | null>(null);

  useEffect(() => {
    axios
      .get("http://127.0.0.1:8000/create")
      .then((response) => {
        console.log("Response from API:", response.data);
        if (response.data) {
          console.log("New Lobby Key:", response.data);
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

  return <div>{newLobbyKey ? newLobbyKey : spinner()}</div>;
}

export default CreateLobby;
