import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Home from './pages/HomeScreen';
import CreateLobby from './pages/CreateLobby';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/create" element={<CreateLobby />} />
      </Routes>
    </Router>
  );
}

export default App;