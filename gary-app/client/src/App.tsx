import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import Landing from './pages/Landing';
import Room from './pages/Room';

const App: React.FC = () => {
  return (
    <Router>
      <div className="flex min-h-screen">
        <Sidebar />
        <div className="flex-1 ml-64">
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/room/:id" element={<Room />} />
          </Routes>
        </div>
      </div>
    </Router>
  );
};

export default App;