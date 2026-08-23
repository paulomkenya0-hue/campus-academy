import { useEffect, useState } from "react";
import { doc, updateDoc, serverTimestamp, collection, query, where, getDocs, documentId } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { db, storage } from "../firebase";
import { useAuth } from "../context/AuthContext.jsx";
import { NavBar } from "../components/NavBar.jsx";
import { XpBadge, StreakBadge } from "../components/Badges.jsx";

const MAX_SIZE = 3 * 1024 * 1024;
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];

export default function Profile() {
  const { user, profile } = useAuth();
  const [bio, setBio] = useState(profile?.bio || "");
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [earnedBadges, setEarnedBadges] = useState([]);

  useEffect(() => {
    async function loadBadges() {
      if (!profile) return;
      const earnedSnap = await getDocs(query(collection(db, "studentBadges"), where("studentId", "==", profile.id)));
      const keys = earnedSnap.docs.map((d) => d.data().badgeKey);
      if (keys.length === 0) return setEarnedBadges([]);
      const badgesSnap = await getDocs(query(collection(db, "badges"), where(documentId(), "in", keys.slice(0, 30))));
      setEarnedBadges(badgesSnap.docs.map((d) => ({ id: d.id, ...d.data() })));
    }
    loadBadges();
  }, [profile]);

  async function handlePhotoChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError("");

    if (!ALLOWED_TYPES.includes(file.type)) {
      setError("Aina ya faili haikubaliki. Tumia JPEG, PNG, au WebP.");
      return;
    }
    if (file.size > MAX_SIZE) {
      setError("Picha ni kubwa sana. Kiwango cha juu ni MB 3.");
      return;
    }

    setUploading(true);
    try {
      const safeName = `avatar.${file.type.split("/")[1]}`;
      const storageRef = ref(storage, `profilePictures/${user.uid}/${safeName}`);
      await uploadBytes(storageRef, file);
      const url = await getDownloadURL(storageRef);
      await updateDoc(doc(db, "students", user.uid), { photoURL: url, updatedAt: serverTimestamp() });
      setMessage("Picha imesasishwa.");
    } catch (err) {
      setError("Samahani, kuna tatizo. Jaribu tena.");
    } finally {
      setUploading(false);
    }
  }

  async function handleSaveBio() {
    setSaving(true);
    setError("");
    try {
      await updateDoc(doc(db, "students", user.uid), { bio, updatedAt: serverTimestamp() });
      setMessage("Wasifu umehifadhiwa.");
    } catch (err) {
      setError("Samahani, kuna tatizo. Jaribu tena.");
    } finally {
      setSaving(false);
    }
  }

  if (!profile) return null;

  return (
    <div className="min-h-screen">
      <NavBar />
      <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">
        <div className="card flex items-center gap-5">
          {profile.photoURL ? (
            <img src={profile.photoURL} alt="" className="w-20 h-20 rounded-full object-cover" />
          ) : (
            <div className="w-20 h-20 rounded-full bg-night-raised flex items-center justify-center text-2xl">
              {profile.displayName?.[0]}
            </div>
          )}
          <div>
            <p className="font-display font-bold text-lg">{profile.displayName}</p>
            <p className="text-ivory-muted text-sm font-mono">{profile.regNumber}</p>
            <label className="inline-block mt-2 text-sm text-teal cursor-pointer hover:underline">
              {uploading ? "Inapakia..." : "Badilisha Picha"}
              <input type="file" accept="image/jpeg,image/png,image/webp" className="hidden"
                onChange={handlePhotoChange} disabled={uploading} />
            </label>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <XpBadge level={profile.level} xp={profile.xp} />
          <StreakBadge current={profile.streak?.current || 0} longest={profile.streak?.longest || 0} />
        </div>

        <div className="card">
          <p className="label mb-3">Beji Zangu ({earnedBadges.length})</p>
          {earnedBadges.length > 0 ? (
            <div className="flex flex-wrap gap-3">
              {earnedBadges.map((b) => (
                <div key={b.id} title={b.description} className="flex flex-col items-center w-16">
                  <span className="text-3xl">{b.icon}</span>
                  <span className="text-xs text-center text-ivory-muted mt-1">{b.name}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-ivory-muted text-sm">Bado hujapata beji. Endelea kujifunza!</p>
          )}
        </div>

        <div className="card">
          <label className="label">Bio Fupi</label>
          <textarea
            className="input-field min-h-[100px]"
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            maxLength={300}
          />
          <button onClick={handleSaveBio} disabled={saving} className="btn-primary mt-3">
            {saving ? "Inahifadhi..." : "Hifadhi"}
          </button>
        </div>

        {message && <p className="text-teal text-sm">{message}</p>}
        {error && <p className="text-danger text-sm">{error}</p>}
      </div>
    </div>
  );
}
