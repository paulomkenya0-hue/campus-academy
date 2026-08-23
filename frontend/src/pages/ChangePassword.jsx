import { useState } from "react";
import { updatePassword } from "firebase/auth";
import { doc, updateDoc, serverTimestamp } from "firebase/firestore";
import { useNavigate } from "react-router-dom";
import { auth, db } from "../firebase";
import { useAuth } from "../context/AuthContext.jsx";

export default function ChangePassword() {
  const { user } = useAuth();
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    if (newPassword !== confirmPassword) return setError("Password hazifanani.");
    if (newPassword.length < 8) return setError("Password lazima iwe na herufi 8 au zaidi.");
    setLoading(true);
    try {
      await updatePassword(user, newPassword);
      await updateDoc(doc(db, "students", user.uid), {
        mustChangePassword: false,
        updatedAt: serverTimestamp(),
      });
      navigate("/");
    } catch (err) {
      setError("Samahani, jaribu kutoka na kuingia tena kisha weka password mpya.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-amber">Weka Password Mpya</h1>
          <p className="text-ivory-muted mt-1 text-sm">Hii ni mara yako ya kwanza kuingia.</p>
        </div>
        <form onSubmit={handleSubmit} className="card space-y-4">
          <div>
            <label className="label">Password Mpya</label>
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
            {loading ? "Inahifadhi..." : "Hifadhi na Endelea"}
          </button>
        </form>
      </div>
    </div>
  );
}
