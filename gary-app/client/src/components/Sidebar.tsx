// src/components/Sidebar.tsx
"use client";

import * as React from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { User } from "firebase/auth";
import { auth } from "../firebase";
import { useTheme } from "../lib/ThemeContext";
import { Home, User2, PlusSquare, ListMusic, LogOut, Moon, Sun, Menu, Music } from "lucide-react";
import { cn } from "../lib/utils";
import { Sheet, SheetContent } from "./ui/sheet";

interface SidebarProps {
  user: User | null;
  mobileOpen?: boolean;
  onMobileToggle?: (open: boolean) => void;
}

const SIDEBAR_WIDTH = "18rem";
const SIDEBAR_WIDTH_MOBILE = "20rem";
const SIDEBAR_WIDTH_ICON = "4rem";
const SIDEBAR_KEYBOARD_SHORTCUT = "b";

const Sidebar = ({ user, mobileOpen, onMobileToggle }: SidebarProps) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { theme, toggleTheme } = useTheme();

  const [isMobile, setIsMobile] = React.useState(false);
  const [open, setOpen] = React.useState(true);
  const [internalMobileOpen, setInternalMobileOpen] = React.useState(false);

  const isMobileOpen = mobileOpen !== undefined ? mobileOpen : internalMobileOpen;
  const setMobileOpen = (value: boolean) => {
    if (onMobileToggle) {
      onMobileToggle(value);
    } else {
      setInternalMobileOpen(value);
    }
  };

  React.useEffect(() => {
    const checkIsMobile = () => setIsMobile(window.innerWidth < 768);
    checkIsMobile();
    window.addEventListener("resize", checkIsMobile);
    return () => window.removeEventListener("resize", checkIsMobile);
  }, []);

  const toggleSidebar = React.useCallback(() => {
    if (isMobile) {
      setMobileOpen(!isMobileOpen);
    } else {
      setOpen((prev) => !prev);
    }
  }, [isMobile, isMobileOpen, setMobileOpen]);

  React.useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === SIDEBAR_KEYBOARD_SHORTCUT && (event.metaKey || event.ctrlKey)) {
        event.preventDefault();
        toggleSidebar();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [toggleSidebar]);

  const createRoom = () => {
    if (user) {
      const roomId = Math.random().toString(36).substring(7);
      navigate(`/room/${roomId}`);
    } else {
      navigate("/");
    }
  };

  const state = open ? "expanded" : "collapsed";

  // Equalizer animation component for music-themed UI
  const Equalizer = () => (
    <div className="equalizer-container ml-2">
      <div className="equalizer-bar"></div>
      <div className="equalizer-bar"></div>
      <div className="equalizer-bar"></div>
      <div className="equalizer-bar"></div>
    </div>
  );

  if (isMobile) {
    return (
      <Sheet open={isMobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent
          className="w-[20rem] bg-sidebar p-0 text-sidebar-foreground shadow-lg border-r border-sidebar-border"
          side="left"
        >
          <div className="flex flex-col h-full">
            <div className="flex items-center gap-3 p-4 border-b border-sidebar-border">
              <div className="flex items-center">
                <img src="/gary_logo.png" alt="Gary Logo" className="h-10 rounded-full" />
                <Equalizer />
              </div>
              <span className="text-xl font-bold gradient-text">Gary</span>
            </div>
            <div className="flex-1 flex flex-col gap-4 p-4">
              <button
                onClick={() => navigate("/")}
                className={cn(
                  "flex items-center gap-3 p-3 rounded-md text-base hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors",
                  location.pathname === "/" && "bg-music-surface text-music-text font-medium border-l-4 border-music-primary"
                )}
              >
                <Home className="h-5 w-5" />
                <span>Home</span>
              </button>
              {user && (
                <>
                  <button
                    onClick={() => navigate("/me")}
                    className={cn(
                      "flex items-center gap-3 p-3 rounded-md text-base hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors",
                      location.pathname === "/me" && "bg-music-surface text-music-text font-medium border-l-4 border-music-primary"
                    )}
                  >
                    <User2 className="h-5 w-5" />
                    <span>My Profile</span>
                  </button>
                  <button
                    onClick={createRoom}
                    className="flex items-center gap-3 p-3 rounded-md text-base hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors group"
                  >
                    <PlusSquare className="h-5 w-5 group-hover:text-music-primary transition-colors" />
                    <span>Create Room</span>
                  </button>
                  <button
                    onClick={() => navigate("/rooms")}
                    className={cn(
                      "flex items-center gap-3 p-3 rounded-md text-base hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors",
                      location.pathname === "/rooms" && "bg-music-surface text-music-text font-medium border-l-4 border-music-primary"
                    )}
                  >
                    <ListMusic className="h-5 w-5" />
                    <span>View Rooms</span>
                  </button>
                </>
              )}
            </div>
            <div className="p-4 flex flex-col gap-4 border-t border-sidebar-border">
              <button
                onClick={user ? () => auth.signOut() : () => navigate("/")}
                className="flex items-center gap-3 p-3 rounded-md text-base hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors"
              >
                {user ? <LogOut className="h-5 w-5" /> : <User2 className="h-5 w-5" />}
                <span>{user ? "Logout" : "Login / Sign Up"}</span>
              </button>
              <button
                onClick={toggleTheme}
                className="flex justify-between items-center p-3 bg-sidebar-muted rounded-lg text-base hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors"
              >
                <span className="flex items-center gap-3">
                  {theme === "light" ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5 text-music-accent" />}
                  {theme === "light" ? "Dark Mode" : "Light Mode"}
                </span>
                <span className="text-sm text-muted-foreground">{theme === "light" ? "Off" : "On"}</span>
              </button>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    );
  }

  // Desktop sidebar (fixed)
  return (
    <div
      className={cn(
        "hidden md:flex flex-col h-screen bg-sidebar text-sidebar-foreground shadow-lg border-r border-sidebar-border transition-all duration-200 fixed top-0 left-0 z-40",
        state === "expanded" ? "w-[18rem]" : "w-[4rem]"
      )}
    >
      <div className="flex items-center justify-between p-4 border-b border-sidebar-border">
        {state === "expanded" && (
          <>
            <div className="flex items-center gap-2">
              <div className="relative">
                <img src="/gary_logo.png" alt="Gary Logo" className="h-10 rounded-full" />
                <div className="absolute -right-1 -bottom-1 bg-music-primary h-3 w-3 rounded-full animate-pulse-slow"></div>
              </div>
              <span className="text-xl font-bold gradient-text">Gary</span>
              <Equalizer />
            </div>
            <button
              onClick={toggleSidebar}
              className="p-2 rounded-md hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors"
            >
              <Menu className="h-5 w-5" />
            </button>
          </>
        )}
        {state === "collapsed" && (
          <button
            onClick={toggleSidebar}
            className="p-2 rounded-md hover:bg-sidebar-accent hover:text-sidebar-accent-foreground w-full transition-colors"
          >
            <Menu className="h-5 w-5" />
          </button>
        )}
      </div>
      <div className="flex-1 flex flex-col gap-4 p-4">
        <button
          onClick={() => navigate("/")}
          className={cn(
            "flex items-center gap-3 p-3 rounded-md text-base hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors",
            location.pathname === "/" && "bg-music-surface text-music-text font-medium border-l-4 border-music-primary",
            state === "collapsed" && "justify-center p-2"
          )}
        >
          <Home className="h-5 w-5" />
          {state === "expanded" && <span>Home</span>}
        </button>
        {user && (
          <>
            <button
              onClick={() => navigate("/me")}
              className={cn(
                "flex items-center gap-3 p-3 rounded-md text-base hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors",
                location.pathname === "/me" && "bg-music-surface text-music-text font-medium border-l-4 border-music-primary",
                state === "collapsed" && "justify-center p-2"
              )}
            >
              <User2 className="h-5 w-5" />
              {state === "expanded" && <span>My Profile</span>}
            </button>
            <button
              onClick={createRoom}
              className={cn(
                "flex items-center gap-3 p-3 rounded-md text-base hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors group",
                state === "collapsed" && "justify-center p-2"
              )}
            >
              <PlusSquare className="h-5 w-5 group-hover:text-music-primary transition-colors" />
              {state === "expanded" && <span>Create Room</span>}
            </button>
            <button
              onClick={() => navigate("/rooms")}
              className={cn(
                "flex items-center gap-3 p-3 rounded-md text-base hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors",
                location.pathname === "/rooms" && "bg-music-surface text-music-text font-medium border-l-4 border-music-primary",
                state === "collapsed" && "justify-center p-2"
              )}
            >
              <ListMusic className="h-5 w-5" />
              {state === "expanded" && <span>View Rooms</span>}
            </button>
          </>
        )}
      </div>
      <div className="p-4 flex flex-col gap-4 border-t border-sidebar-border">
        <button
          onClick={user ? () => auth.signOut() : () => navigate("/")}
          className={cn(
            "flex items-center gap-3 p-3 rounded-md text-base hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors",
            state === "collapsed" && "justify-center p-2"
          )}
        >
          {user ? <LogOut className="h-5 w-5" /> : <User2 className="h-5 w-5" />}
          {state === "expanded" && <span>{user ? "Logout" : "Login / Sign Up"}</span>}
        </button>
        {state === "expanded" ? (
          <button
            onClick={toggleTheme}
            className="flex justify-between items-center p-3 bg-sidebar-muted rounded-lg text-base hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors"
          >
            <span className="flex items-center gap-3">
              {theme === "light" ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5 text-music-accent" />}
              {theme === "light" ? "Dark Mode" : "Light Mode"}
            </span>
            <span className="text-sm text-muted-foreground">{theme === "light" ? "Off" : "On"}</span>
          </button>
        ) : (
          <button
            onClick={toggleTheme}
            className="flex justify-center p-2 rounded-md text-base hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors"
          >
            {theme === "light" ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5 text-music-accent" />}
          </button>
        )}
      </div>
    </div>
  );
};

export default Sidebar;
export { Sidebar };