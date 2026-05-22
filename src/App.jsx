import { useEffect } from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import { useAuthStore } from "./store/store";
import {
  getCurrentUser,
  ensureUserProfile,
  supabase,
} from "./services/supabase";
import { Login, Signup } from "./pages/Auth";
import { Dashboard } from "./pages/Dashboard";
import { Profile } from "./pages/Profile";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { Bookmarks } from "./pages/Bookmarks";

function App() {
  const { user, isLoading, setUser, setLoading } = useAuthStore();

  useEffect(() => {
    let subscription;

    const initAuth = async () => {
      try {
        const user = await getCurrentUser();
        setUser(user);

        const {
          data: { subscription: authSubscription },
        } = supabase.auth.onAuthStateChange((_event, session) => {
          setUser(session?.user || null);
        });

        subscription = authSubscription;
      } catch (error) {
        console.error("Auth init error:", error);
        setLoading(false);
      }
    };

    initAuth();

    return () => subscription?.unsubscribe();
  }, [setUser, setLoading]);

  useEffect(() => {
    if (!user) return;

    ensureUserProfile(user).catch((error) => {
      console.error("Failed to ensure user profile:", error);
    });
  }, [user]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-dark-900 via-dark-800 to-dark-900 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 rounded-full border-4 border-dark-700 border-t-accent-blue animate-spin mb-4 mx-auto"></div>
          <p className="text-white font-bold text-xl mb-2">Anime Tracker</p>
          <p className="text-dark-300">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <Router>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/profile"
          element={
            <ProtectedRoute>
              <Profile />
            </ProtectedRoute>
          }
        />
        <Route
          path="/profile/:identifier"
          element={
            <ProtectedRoute>
              <Profile />
            </ProtectedRoute>
          }
        />
        <Route
          path="/bookmarks"
          element={
            <ProtectedRoute>
              <Bookmarks />
            </ProtectedRoute>
          }
        />
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </Router>
  );
}

export default App;
