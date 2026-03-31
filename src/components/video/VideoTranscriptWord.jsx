import React, { useState, useRef, useEffect } from "react";

export default function VideoTranscriptWord({ 
  word, 
  hebrew,
  transliteration,
  english,
  onEdit,
  onAddToBackpack,
  className = ""
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [value, setValue] = useState(word || "");
  const inputRef = useRef(null);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  if (!word) return null;

  const handleSave = () => {
    if (value && value.trim() && value !== word && onEdit) {
      onEdit(value.trim());
    }
    setIsEditing(false);
  };

  const handleCancel = () => {
    setValue(word);
    setIsEditing(false);
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleSave();
    } else if (e.key === "Escape") {
      handleCancel();
    }
  };

  if (isEditing) {
    return (
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onBlur={handleSave}
        onKeyDown={handleKeyDown}
        className={`inline-block bg-white/20 border border-cyan-400 rounded px-1 outline-none ${className}`}
        style={{ width: `${Math.max(value.length * 8 + 10, 40)}px` }}
      />
    );
  }

  return (
    <span className="relative inline-block">
      <span
        onClick={(e) => {
          e.stopPropagation();
          setIsEditing(true);
        }}
        className={`cursor-pointer hover:bg-cyan-500/30 px-1 rounded transition-all ${className}`}
      >
        {word}
      </span>
    </span>
  );
}