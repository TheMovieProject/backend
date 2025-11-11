import React, { useEffect, useRef, useState, memo } from "react";

const ReplyBox = memo(function ReplyBox({
  open,
  placeholder = "Reply…",
  onSubmit,
}: {
  open: boolean;
  placeholder?: string;
  onSubmit: (text: string) => void;
}) {
  const [val, setVal] = useState("");
  const inputRef = useRef<HTMLInputElement | null>(null);

  // keep focus when opened / while typing
  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  if (!open) return null;

  return (
    <div className="mt-2 flex items-center gap-2">
      <input
        ref={inputRef}
        className="flex-1 px-3 py-2 rounded-lg bg-gray-600/50 text-white border border-yellow-500/30 text-sm"
        placeholder={placeholder}
        value={val}
        onChange={(e) => setVal(e.target.value)}
      />
      <button
        onClick={() => {
          const t = val.trim();
          if (!t) return;
          onSubmit(t);
          setVal(""); // clear after posting
          // keep focus so user can continue
          requestAnimationFrame(() => inputRef.current?.focus());
        }}
        className="bg-yellow-500 hover:bg-yellow-600 text-gray-900 px-3 py-2 rounded-lg text-sm font-bold"
      >
        Post
      </button>
    </div>
  );
});
