import { useState } from "react";
import { updatePassword } from "firebase/auth";
import { doc, updateDoc, serverTimestamp } from "firebase/firestore";
import { useNavigate } from "react-router-dom";
import { auth, db } from "../firebase";
import { useAuth } from "../context/AuthContext.jsx";

export default function ChangePassword() {
  const { user } = useAuth();
  const [newPassword, setNewPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();
    if (newPassword.length < 8) return setError("Password lazima iwe na herufi 8+.");
    setLoading(true);
    try {
      await updatePassword(user, newPassword);
      await updateDoc(doc(db, "students", user.uid), { mustChangePassword: false, updatedAt: serverTimestamp() });
      navigate("/");
    } catch (err) {
      setError("Samahani, ingia tena kisha jaribu (usalama unahitaji uwe umeingia hivi karibuni).");
    } finally { setLoading(false); }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <form onSubmit={handleSubmit} className="card w-full max-w-sm space-y-4">
        <h1 className="text-xl font-bold text-amber">Weka Password Mpya</h1>
        <input type="password" className="input-field" placeholder="Password mpya"
          value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required />
        {error && <p className="text-danger text-sm">{error}</p>}
        <button className="btn-primary w-full" disabled={loading}>{loading ? "..." : "Hifadhi"}</button>
      </form>
    </div>
  );
}
