import React from "react";
import ClickableWord from "./ClickableWord";

// Helper to wrap any text and make Hebrew/transliterated words clickable
// Pass a dictionary of words with their translations

export default function ClickableText({ 
  text, 
  words = [], // Array of { word, transliteration, translation }
  className = "" 
}) {
  if (!text || words.length === 0) {
    return <span className={className}>{text}</span>;
  }

  // Create a regex to match any of the words (Hebrew or transliteration)
  const patterns = words.flatMap(w => [w.word, w.transliteration].filter(Boolean));
  if (patterns.length === 0) {
    return <span className={className}>{text}</span>;
  }

  const regex = new RegExp(`(${patterns.map(p => p.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})`, 'gi');
  const parts = text.split(regex);

  return (
    <span className={className}>
      {parts.map((part, i) => {
        const matchedWord = words.find(w => 
          w.word?.toLowerCase() === part.toLowerCase() || 
          w.transliteration?.toLowerCase() === part.toLowerCase()
        );

        if (matchedWord) {
          return (
            <ClickableWord
              key={i}
              word={matchedWord.word}
              transliteration={matchedWord.transliteration}
              translation={matchedWord.translation}
              variant={part === matchedWord.word ? "hebrew" : "transliteration"}
            />
          );
        }
        return <span key={i}>{part}</span>;
      })}
    </span>
  );
}