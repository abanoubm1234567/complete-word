import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Home from "./pages/HomeScreen";
import Lobby from "./pages/Lobby";

function App() {
  return (
    <Router basename="/complete-word">
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/lobby" element={<Lobby />} />
      </Routes>
    </Router>
  );
}

export default App;
