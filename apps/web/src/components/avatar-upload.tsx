"use client";

import { useRef, useState, useEffect } from "react";

export function AvatarUpload() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [src, setSrc] = useState<string | null>(null);
  const [hover, setHover] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem("gojo_avatar");
    if (saved) setSrc(saved);
  }, []);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      setSrc(result);
      localStorage.setItem("gojo_avatar", result);
    };
    reader.readAsDataURL(file);
  }

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleChange}
      />
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        onMouseEnter={() => setHover(true)}
        onMouseLeave={() => setHover(false)}
        className="relative flex h-16 w-16 shrink-0 items-center justify-center rounded-full overflow-hidden transition-opacity"
        style={{
          background: src ? "transparent" : "#f8f4ec",
          border: src ? "2px solid rgba(0,0,0,0.06)" : "2px dashed rgba(232,66,10,0.4)",
          cursor: "pointer",
          opacity: hover ? 0.85 : 1,
        }}
        title="Загрузить фото"
      >
        {src ? (
          <>
            <img src={src} alt="avatar" className="h-full w-full object-cover" />
            {hover && (
              <div
                className="absolute inset-0 flex items-center justify-center rounded-full"
                style={{ background: "rgba(0,0,0,0.45)" }}
              >
                <span style={{ color: "white", fontSize: 18 }}>✎</span>
              </div>
            )}
          </>
        ) : (
          <span style={{ color: "#e8420a", fontSize: 22, lineHeight: 1 }}>+</span>
        )}
      </button>
    </>
  );
}
