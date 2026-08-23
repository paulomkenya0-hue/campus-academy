import { useState } from "react";
import { signInWithEmailAndPassword } from "firebase/auth";
import { useNavigate } from "react-router-dom";
import { auth, emailForRegNumber } from "../firebase";
import { homeForRole } from "../context/AuthContext.jsx";

export default function Login() {
  const [mode, setMode] = useState("student"); // "student" | "admin"
  const [regNumber, setRegNumber] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      // Hatua muhimu: barua pepe ya Admin HAIPITII emailForRegNumber() kamwe —
      // inatumwa moja kwa moja kwa Firebase Auth.
      const loginEmail = mode === "student" ? emailForRegNumber(regNumber) : email.trim();

      const cred = await signInWithEmailAndPassword(auth, loginEmail, password);
      const tokenResult = await cred.user.getIdTokenResult();
      const role = tokenResult.claims.role || null;

      navigate(homeForRole(role));
    } catch (err) {
      setError(
        mode === "student"
          ? "Samahani, namba ya usajili au password si sahihi."
          : "Samahani, email au password si sahihi."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-6">
          <h1 className="text-3xl font-bold text-amber">Campus Academy</h1>
          <p className="text-ivory-muted mt-1">Jifunze. Fanya. Shindana. Thibitisha.</p>
        </div>

        <div className="flex gap-2 mb-4">
          <button
            type="button"
            onClick={() => { setMode("student"); setError(""); }}
            className={`flex-1 py-2 rounded-lg text-sm font-bold transition-colors ${
              mode === "student" ? "bg-amber text-night" : "bg-night-raised text-ivory-muted"
            }`}
          >
            Mwanafunzi
          </button>
          <button
            type="button"
            onClick={() => { setMode("admin"); setError(""); }}
            className={`flex-1 py-2 rounded-lg text-sm font-bold transition-colors ${
              mode === "admin" ? "bg-amber text-night" : "bg-night-raised text-ivory-muted"
            }`}
          >
            Admin
          </button>
        </div>

        <form onSubmit={handleSubmit} className="card space-y-4">
          {mode === "student" ? (
            <div>
              <label className="label">Namba ya Usajili</label>
              <input
                className="input-field"
                placeholder="RUCU/2026/001"
                value={regNumber}
                onChange={(e) => setRegNumber(e.target.value)}
                required
              />
            </div>
          ) : (
            <div>
              <label className="label">Barua Pepe ya Admin</label>
              <input
                type="email"
                className="input-field"
                placeholder="admin@campusacademy.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
          )}

          <div>
            <label className="label">Password</label>
            <input
              type="password"
              className="input-field"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          {error && <p className="text-danger text-sm">{error}</p>}
          <button type="submit" disabled={loading} className="btn-primary w-full">
            {loading ? "Inaingia..." : "Ingia"}
          </button>
        </form>
      </div>
    </div>
  );
}
