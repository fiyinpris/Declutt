import { useRef, useState } from "react";
import { doc, updateDoc } from "firebase/firestore";
import { db } from "../firebase";
import { useAuth } from "../context/AuthContext";
import { compressToBase64 } from "../utils/images";
import { Ico, Spin } from "./Ico";

const getInitials = (name) =>
  name
    ? name
        .trim()
        .split(/\s+/)
        .slice(0, 2)
        .map((n) => n[0])
        .join("")
        .toUpperCase()
    : "?";

/** Profile photo picker used on the buyer and seller "My Profile" tabs. */
const ProfilePhotoCard = () => {
  const { user, profile, refreshProfile } = useAuth();
  const photoRef = useRef();
  const [photoPreview, setPhotoPreview] = useState(
    profile?.photoURL || user?.photoURL || null,
  );
  const [photoFile, setPhotoFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadDone, setUploadDone] = useState(false);
  const [error, setError] = useState("");

  const handlePhoto = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("Please choose an image file.");
      return;
    }
    setError("");
    setPhotoFile(file);
    setPhotoPreview(URL.createObjectURL(file));
  };

  const uploadPhoto = async () => {
    if (!photoFile || !profile?.uid) return;
    setUploading(true);
    setError("");
    try {
      const base64 = await compressToBase64(photoFile);
      await updateDoc(doc(db, "users", profile.uid), { photoURL: base64 });
      await refreshProfile(); // also updates the photo people see in chats
      setPhotoFile(null);
      setUploadDone(true);
      setTimeout(() => setUploadDone(false), 2500);
    } catch (e) {
      console.error(e);
      setError("Couldn't save your photo. Please try again.");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div
      className="p-5 rounded-2xl bg-card space-y-4"
      style={{ border: "1.5px solid hsl(var(--border))" }}
    >
      <p className="text-sm font-bold text-foreground text-center">
        Profile Photo
      </p>
      <div className="flex flex-col items-center gap-4">
        <div className="relative">
          <div className="w-24 h-24 rounded-full overflow-hidden bg-primary/15 text-primary flex items-center justify-center text-2xl font-black border-2 border-primary/25">
            {photoPreview ? (
              <img
                src={photoPreview}
                alt="avatar"
                referrerPolicy="no-referrer"
                onError={() => setPhotoPreview(null)}
                className="w-full h-full object-cover"
              />
            ) : (
              getInitials(profile?.name)
            )}
          </div>
          <button
            onClick={() => photoRef.current?.click()}
            aria-label="Choose profile photo"
            className="absolute bottom-0 right-0 w-7 h-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-md hover:bg-primary/90 transition-colors"
          >
            <Ico s={12} w={2.5} r>
              <path d="M12 5v14M5 12h14" />
            </Ico>
          </button>
        </div>
        <div className="flex flex-col items-center gap-2">
          <p className="text-xs text-foreground/50">
            JPG, PNG, WEBP · Any size · Shown to people you chat with
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => photoRef.current?.click()}
              className="px-4 py-2 rounded-xl text-xs font-bold text-foreground/70 hover:text-foreground transition-all"
              style={{ border: "1.5px solid hsl(var(--border))" }}
            >
              Choose photo
            </button>
            {(photoFile || uploadDone) && (
              <button
                onClick={uploadPhoto}
                disabled={uploading || uploadDone}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${uploadDone ? "bg-green-500 text-white" : "main-button"}`}
              >
                {uploading && <Spin s={12} />}
                {uploadDone
                  ? "Saved!"
                  : uploading
                    ? "Uploading…"
                    : "Save photo"}
              </button>
            )}
          </div>
          {error && <p className="text-xs text-red-500">{error}</p>}
        </div>
      </div>
      <input
        ref={photoRef}
        type="file"
        accept="image/*"
        onChange={handlePhoto}
        className="hidden"
      />
    </div>
  );
};

export default ProfilePhotoCard;
