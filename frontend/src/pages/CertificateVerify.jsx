import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../firebase";

export default function CertificateVerify() {
  const { certId } = useParams();
  const [cert, setCert] = useState(undefined); // undefined = loading, null = not found

  useEffect(() => {
    async function load() {
      const snap = await getDoc(doc(db, "certificates", certId));
      setCert(snap.exists() ? snap.data() : null);
    }
    load();
  }, [certId]);

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-md card text-center">
        <h1 className="font-display font-bold text-amber mb-4">Uthibitisho wa Cheti</h1>

        {cert === undefined && <p className="text-ivory-muted">Inapakia...</p>}

        {cert === null && (
          <div>
            <p className="text-4xl mb-2">❌</p>
            <p className="text-danger font-bold">Cheti hakikupatikana</p>
            <p className="text-ivory-muted text-sm mt-1">Namba ya cheti si sahihi.</p>
          </div>
        )}

        {cert && (
          <div>
            <p className="text-4xl mb-2">{cert.status === "valid" ? "✅" : "⚠️"}</p>
            <p className={`font-bold mb-4 ${cert.status === "valid" ? "text-teal" : "text-danger"}`}>
              {cert.status === "valid" ? "Cheti Kimethibitishwa" : "Cheti Kimefutwa"}
            </p>
            <img
              src={`https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${encodeURIComponent(window.location.href)}`}
              alt="QR ya uthibitishaji"
              className="mx-auto mb-4 rounded-lg bg-white p-2"
              width={160}
              height={160}
            />
            <div className="text-left space-y-2 text-sm border-t border-night-border pt-4">
              <p><span className="text-ivory-muted">Jina:</span> {cert.studentName}</p>
              <p><span className="text-ivory-muted">Kozi:</span> {cert.courseName}</p>
              <p><span className="text-ivory-muted">Namba ya Cheti:</span> <span className="font-mono">{cert.certId}</span></p>
              {cert.finalScore != null && (
                <p><span className="text-ivory-muted">Alama:</span> {cert.finalScore}%</p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
