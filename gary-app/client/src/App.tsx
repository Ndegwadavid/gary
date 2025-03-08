import { useEffect, useState } from "react";
import { BrowserRouter as Router, Route, Routes } from "react-router-dom";
import { auth } from "./firebase";
import { onAuthStateChanged, User } from "firebase/auth";
import Sidebar from "./components/Sidebar";
import { Menu } from "lucide-react";
import Landing from "./pages/Landing";
import Room from "./pages/Room";
import Me from "./pages/Me";
import Rooms from "./pages/Rooms";
import Rave from "./pages/Rave";
import { ThemeProvider } from "./lib/ThemeContext";
import "./theme.css";

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  if (loading) {
    return <div className="p-6 text-center text-foreground bg-background">Loading...</div>;
  }

  return (
    <ThemeProvider>
      <Router>
        <div className="flex min-h-screen bg-background text-foreground">
          <Sidebar user={user} mobileOpen={mobileSidebarOpen} onMobileToggle={setMobileSidebarOpen} />
          <div className="flex-1 md:ml-[18rem] lg:ml-[18rem] xl:ml-[18rem]"> {/* Margin for sidebar */}
            <header className="flex items-center p-4 border-b border-border md:hidden">
              <button
                className="mr-2 p-2 rounded-md hover:bg-accent hover:text-accent-foreground"
                onClick={() => setMobileSidebarOpen((prev) => !prev)}
              >
                <Menu className="h-5 w-5" />
                <span className="sr-only">Toggle Sidebar</span>
              </button>
              <h1 className="text-xl font-bold gradient-text">Gary Music</h1>
            </header>
            <main className="p-4">
              <Routes>
                <Route path="/" element={<Landing user={user} />} />
                <Route path="/me" element={<Me user={user} />} />
                <Route path="/rooms" element={<Rooms user={user} />} />
                <Route path="/room/:id" element={<Room user={user} />} />
                <Route path="/rave/:id" element={<Rave user={user} />} />
              </Routes>
            </main>
          </div>
        </div>
      </Router>
    </ThemeProvider>
  );
};

export default App;