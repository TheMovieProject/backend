"use client";

import { useState, ChangeEvent } from "react";

// 🔹 Firebase imports
import { storage } from "@/app/utils/firebase"; // ⬅️ your firebase.js path
import { ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";

// 🔹 Simple PUT upload helper (no tus)
async function uploadFileSimplePUT(
  uploadUrl: string,
  file: File,
  onProgress: (pct: number) => void
) {
  return new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", uploadUrl, true);

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) {
        const pct = Math.floor((event.loaded / event.total) * 100);
        onProgress(pct);
      }
    };

    xhr.onload = () => {
      // Mux will usually respond 200/201/204 on success
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve();
      } else {
        reject(new Error("Upload failed with status " + xhr.status));
      }
    };

    xhr.onerror = () => reject(new Error("Network error during upload"));

    xhr.send(file);
  });
}

export default function UploadPage() {
  const [file, setFile] = useState<File | null>(null);
  const [progress, setProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [language, setLanguage] = useState("en");
  const [posterUrl, setPosterUrl] = useState("");

  const [visibility, setVisibility] =
    useState<"public" | "unlisted" | "private">("public");

  const [castInput, setCastInput] = useState("");
  const [genresInput, setGenresInput] = useState("");
  const [writer, setWriter] = useState("");
  const [director, setDirector] = useState("");
  const [ageRestricted, setAgeRestricted] = useState(false);

  // 🔹 Poster upload states
  const [posterUploading, setPosterUploading] = useState(false);
  const [posterUploadProgress, setPosterUploadProgress] = useState(0);

  // 🔹 Upload thumbnail to Firebase
  const uploadPosterToFirebase = (file: File) => {
    setPosterUploading(true);
    setPosterUploadProgress(0);

    const fileName = `thumbnails/${Date.now()}-${file.name}`;
    const storageRef = ref(storage, fileName);
    const uploadTask = uploadBytesResumable(storageRef, file);

    uploadTask.on(
      "state_changed",
      (snapshot) => {
        const pct =
          (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
        setPosterUploadProgress(Math.round(pct));
      },
      (error) => {
        console.error("Poster upload error:", error);
        alert("Failed to upload thumbnail.");
        setPosterUploading(false);
      },
      () => {
        getDownloadURL(uploadTask.snapshot.ref).then((downloadURL) => {
          setPosterUrl(downloadURL); // 🔥 this URL goes to API as posterUrl
          setPosterUploading(false);
        });
      }
    );
  };

  const handlePosterChange = (e: ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    uploadPosterToFirebase(f);
  };

  const start = async () => {
    if (!file || !title) return;
    if (posterUploading) {
      alert("Please wait for thumbnail upload to finish.");
      return;
    }

    setIsUploading(true);
    setProgress(0);

    const cast = castInput
      .split(",")
      .map((x) => x.trim())
      .filter(Boolean);

    const genres = genresInput
      .split(",")
      .map((x) => x.trim())
      .filter(Boolean);

    // 1) Create upload ticket & DB video row
    const res = await fetch("/api/videos/create-upload", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title,
        description: description || undefined,
        language: language || undefined,
        posterUrl: posterUrl || undefined,
        visibility,
        tags: [],
        cast,
        genres,
        ageRestricted,
        writer: writer || undefined,
        director: director || undefined,
      }),
    });

    if (!res.ok) {
      console.error("Failed to create upload", await res.text());
      setIsUploading(false);
      alert("Failed to create upload ticket.");
      return;
    }

    const { uploadUrl } = await res.json();

    // 2) Upload file directly via PUT (no tus-js-client)
    try {
      await uploadFileSimplePUT(uploadUrl, file, (pct) => {
        setProgress(pct);
      });

      alert("Uploaded! Processing will start, you’ll be notified when ready.");
    } catch (err) {
      console.error("Upload error:", err);
      alert("Upload failed.");
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="min-h-screen bg-yellow-600 flex items-center justify-center p-7 pt-20">
      <div className="w-full max-w-4xl bg-black/90 text-white rounded-2xl shadow-2xl p-6 md:p-8">
        <h1 className="text-2xl md:text-3xl font-semibold mb-2">
          Upload your film
        </h1>
        <p className="text-sm text-gray-300 mb-6">
          Add your film details, upload the file, and we&apos;ll handle the
          processing.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* LEFT: File + basic info */}
          <div className="md:col-span-2 space-y-4">
            {/* File */}
            <div>
              <label className="block text-sm mb-1 font-medium">
                Video file
              </label>
              <input
                type="file"
                accept="video/*"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
                className="block w-full text-sm text-gray-200
                           file:mr-4 file:py-2 file:px-4
                           file:rounded-full file:border-0
                           file:bg-yellow-500 file:text-black
                           hover:file:bg-yellow-400"
              />
              <p className="text-xs text-gray-400 mt-1">
                Supported: MP4, MOV, etc.
              </p>
            </div>

            {/* Title */}
            <div>
              <label className="block text-sm mb-1 font-medium">
                Title <span className="text-red-400">*</span>
              </label>
              <input
                className="w-full rounded-lg px-3 py-2 text-white outline-none focus:ring-2 focus:ring-yellow-400"
                placeholder="Give your film a title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm mb-1 font-medium">
                Description
              </label>
              <textarea
                className="w-full rounded-lg px-3 py-2 text-white min-h-[100px] outline-none focus:ring-2 focus:ring-yellow-400"
                placeholder="Tell viewers what this film is about..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>

            {/* Cast / Writer / Director */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm mb-1 font-medium">Cast</label>
                <input
                  className="w-full rounded-lg px-3 py-2 text-white outline-none focus:ring-2 focus:ring-yellow-400"
                  placeholder="Actor 1, Actor 2, ..."
                  value={castInput}
                  onChange={(e) => setCastInput(e.target.value)}
                />
                <p className="text-xs text-gray-400 mt-1">
                  Comma-separated list.
                </p>
              </div>
              <div className="space-y-3">
                <div>
                  <label className="block text-sm mb-1 font-medium">
                    Writer
                  </label>
                  <input
                    className="w-full rounded-lg px-3 py-2 text-white outline-none focus:ring-2 focus:ring-yellow-400"
                    placeholder="Writer name(s)"
                    value={writer}
                    onChange={(e) => setWriter(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-sm mb-1 font-medium">
                    Director
                  </label>
                  <input
                    className="w-full rounded-lg px-3 py-2 text-white outline-none focus:ring-2 focus:ring-yellow-400"
                    placeholder="Director name(s)"
                    value={director}
                    onChange={(e) => setDirector(e.target.value)}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* RIGHT: Meta + preview */}
          <div className="space-y-4">
            {/* Language + Visibility */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm mb-1 font-medium">
                  Language
                </label>
                <select
                  className="w-full rounded-lg px-3 py-2 text-white outline-none focus:ring-2 focus:ring-yellow-400"
                  value={language}
                  onChange={(e) => setLanguage(e.target.value)}
                >
                  <option value="en">English</option>
                  <option value="hi">Hindi</option>
                  <option value="es">Spanish</option>
                  <option value="fr">French</option>
                </select>
              </div>
              <div>
                <label className="block text-sm mb-1 font-medium">
                  Visibility
                </label>
                <select
                  className="w-full rounded-lg px-3 py-2 text-white outline-none focus:ring-2 focus:ring-yellow-400"
                  value={visibility}
                  onChange={(e) =>
                    setVisibility(
                      e.target.value as "public" | "unlisted" | "private"
                    )
                  }
                >
                  <option value="public">Public</option>
                  <option value="unlisted">Unlisted</option>
                  <option value="private">Private</option>
                </select>
              </div>
            </div>

            {/* Genres */}
            <div>
              <label className="block text-sm mb-1 font-medium">Genres</label>
              <input
                className="w-full rounded-lg px-3 py-2 text-white outline-none focus:ring-2 focus:ring-yellow-400"
                placeholder="Drama, Thriller, Short, ..."
                value={genresInput}
                onChange={(e) => setGenresInput(e.target.value)}
              />
              <p className="text-xs text-gray-400 mt-1">
                Comma-separated list.
              </p>
            </div>

            {/* Poster thumbnail (Firebase) */}
            <div>
              <label className="block text-sm mb-1 font-medium">
                Poster / Thumbnail
              </label>
              <input
                type="file"
                accept="image/*"
                onChange={handlePosterChange}
                className="block w-full text-sm text-gray-200
                           file:mr-4 file:py-2 file:px-4
                           file:rounded-full file:border-0
                           file:bg-yellow-500 file:text-black
                           hover:file:bg-yellow-400"
              />

              {posterUploading && (
                <p className="text-xs text-gray-400 mt-1">
                  Uploading thumbnail… {posterUploadProgress}%
                </p>
              )}

              {posterUrl && !posterUploading && (
                <div className="mt-2">
                  <p className="text-xs text-gray-300 mb-1">Preview:</p>
                  <img
                    src={posterUrl}
                    alt="Thumbnail preview"
                    className="w-32 h-20 object-cover rounded-md border border-gray-700"
                  />
                </div>
              )}

              {!posterUrl && !posterUploading && (
                <p className="text-xs text-gray-400 mt-1">
                  Choose an image; we&apos;ll upload it and use it as your film
                  thumbnail.
                </p>
              )}
            </div>

            {/* Age restriction */}
            <div className="flex items-center gap-2">
              <input
                id="age-restricted"
                type="checkbox"
                checked={ageRestricted}
                onChange={(e) => setAgeRestricted(e.target.checked)}
                className="h-4 w-4"
              />
              <label htmlFor="age-restricted" className="text-sm">
                This film is restricted to audiences 18+.
              </label>
            </div>

            {/* Preview card */}
            <div className="mt-4 border border-yellow-500/40 rounded-xl p-3 bg-white/5">
              <p className="text-xs text-gray-300 mb-2">Preview</p>
              <div className="flex gap-3">
                <div className="w-24 h-16 bg-gray-700 rounded-md flex items-center justify-center text-xs text-gray-300 overflow-hidden">
                  {posterUrl ? (
                    <img
                      src={posterUrl}
                      alt="Preview"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    "No thumbnail"
                  )}
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold truncate">
                    {title || "Untitled film"}
                  </p>
                  <p className="text-xs text-gray-400">
                    {language.toUpperCase()} · {visibility}
                    {ageRestricted && " · 18+"}
                  </p>
                  <p className="text-xs text-gray-400 mt-1 line-clamp-2">
                    {description || "Your description will appear here."}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="mt-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex-1">
            <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
              <div
                className="h-full bg-yellow-400 transition-all"
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="text-xs text-gray-300 mt-1">
              Progress: {progress}%{" "}
              {isUploading && <span>(don&apos;t close this tab)</span>}
            </p>
          </div>

          <button
            className="px-5 py-2.5 bg-yellow-400 text-black font-medium rounded-full shadow-lg
                       disabled:opacity-60 disabled:cursor-not-allowed
                       hover:bg-yellow-300 transition"
            onClick={start}
            disabled={!file || !title || isUploading || posterUploading}
          >
            {isUploading ? "Uploading..." : "Start upload"}
          </button>
        </div>
      </div>
    </div>
  );
}
