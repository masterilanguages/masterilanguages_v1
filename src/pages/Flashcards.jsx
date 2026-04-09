import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";

export default function Flashcards() {
  const navigate = useNavigate();
  useEffect(() => {
    navigate(createPageUrl("Backpack"), { replace: true });
  }, []);
  return null;
}