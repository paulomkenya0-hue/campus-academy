import { useState } from "react";
import { httpsCallable } from "firebase/functions";
import { signInWithEmailAndPassword } from "firebase/auth";
import { useNavigate, Link } from "react-router-dom";
import { auth, functions } from "../firebase";

export default function Activate() {
  const [regNumber, setRegNumber] = useState("");
  const [activationCode, setActivationCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");

    if (newPassword !== confirmPassword) {
      setError("Password hazifanani.");
      return;
    }
    if (newPassword.length < 8) {
      setError("Password lazima iwe na herufi 8 au zaidi.");
      return;
    }

    setLoading(true);
    try {
      const activate = httpsCallable(functions, "activateAccount");
      const { data } = await activate({ regNumber, activationCode, newPassword });
      await signInWithEmailAndPassword(auth, data.email, newPassword);
      navigate("/");
    } catch (err) {
      setError(err.message?.replace(/^.*?:\s*/, "") || "Samahani, kuna tatizo. Jaribu tena.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-amber">Anzisha Akaunti Yako</h1>
          <p className="text-ivory-muted mt-1 text-sm">
            Tumia namba ya usajili na msimbo ulioupokea kutoka kwa Admin.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="card space-y-4">
          <div>
            <label className="label">Namba ya Usajili</label>
            <input className="input-field" placeholder="RUCU/2026/001" value={regNumber}
              onChange={(e) => setRegNumber(e.target.value)} required />
          </div>
          <div>
            <label className="label">Msimbo wa Uanzishaji</label>
            <input className="input-field" placeholder="XXXXXX" value={activationCode}
              onChange={(e) => setActivationCode(e.target.value)} required />
          </div>
          <div>
            <label className="label">Weka Password Mpya</label>
            <input type="password" className="input-field" value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)} required />
          </div>
          <div>
            <label className="label">Thibitisha Password</label>
            <input type="password" className="input-field" value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)} required />
          </div>
          {error && <p className="text-danger text-sm">{error}</p>}
          <button type="submit" disabled={loading} className="btn-primary w-full">
            {loading ? "Inaanzisha..." : "Anzisha Akaunti"}
          </button>
        </form>

        <p className="text-center text-sm text-ivory-muted mt-4">
          Tayari una akaunti?{" "}
          <Link to="/login" className="text-teal hover:underline">Ingia hapa</Link>
        </p>
      </div>
    </div>
  );
}
