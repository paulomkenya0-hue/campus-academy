import { useState } from "react";
import { signInWithEmailAndPassword } from "firebase/auth";
import { useNavigate, Link } from "react-router-dom";
import { auth, emailForRegNumber } from "../firebase";

export default function Login() {
  const [regNumber, setRegNumber] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const email = emailForRegNumber(regNumber);
      await signInWithEmailAndPassword(auth, email, password);
      navigate("/");
    } catch (err) {
      // Generic Kiswahili message — never confirm/deny whether the reg number exists.
      setError("Samahani, namba ya usajili au password si sahihi.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-amber">Campus Academy</h1>
          <p className="text-ivory-muted mt-1">Jifunze. Fanya. Shindana. Thibitisha.</p>
        </div>

        <form onSubmit={handleSubmit} className="card space-y-4">
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

        <p className="text-center text-sm text-ivory-muted mt-4">
          Bado hujawezesha akaunti yako?{" "}
          <Link to="/activate" className="text-teal hover:underline">
            Anzisha hapa
          </Link>
        </p>
      </div>
    </div>
  );
}
