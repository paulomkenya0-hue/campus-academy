import { createContext, useContext, useEffect, useState } from "react";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { doc, onSnapshot } from "firebase/firestore";
import { auth, db } from "../firebase";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [role, setRole] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (firebaseUser) => {
      if (!firebaseUser) {
        setUser(null);
        setRole(null);
        setProfile(null);
        setLoading(false);
        return;
      }
      setUser(firebaseUser);
      const tokenResult = await firebaseUser.getIdTokenResult(true);
      setRole(tokenResult.claims.role || null);
      setLoading(false);
    });
    return unsub;
  }, []);

  useEffect(() => {
    if (!user || role !== "student") {
      setProfile(null);
      return;
    }
    const ref = doc(db, "students", user.uid);
    const unsub = onSnapshot(ref, (snap) => {
      setProfile(snap.exists() ? { id: snap.id, ...snap.data() } : null);
    });
    return unsub;
  }, [user, role]);

  const logout = () => signOut(auth);

  return (
    <AuthContext.Provider value={{ user, role, profile, loading, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
export function homeForRole(role) {
  if (role === "super_admin" || role === "developer") return "/admin";
  return "/";
}
