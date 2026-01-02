import React, { useRef, useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Eraser } from "lucide-react";

export default function SignaturePad({ value, onChange, disabled }) {
  const canvasRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 1;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    
    // Load existing signature if provided
    if (value) {
      const img = new Image();
      img.onload = () => ctx.drawImage(img, 0, 0);
      img.src = value;
    }
  }, []);

  const getCoordinates = (e) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY
    };
  };

  const startDrawing = (e) => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const coords = getCoordinates(e);
    
    setIsDrawing(true);
    ctx.beginPath();
    ctx.moveTo(coords.x, coords.y);
  };

  const draw = (e) => {
    if (!isDrawing) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const coords = getCoordinates(e);
    
    ctx.lineTo(coords.x, coords.y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    if (!isDrawing) return;
    setIsDrawing(false);
    
    // Save signature as base64
    const canvas = canvasRef.current;
    const dataUrl = canvas.toDataURL('image/png');
    onChange(dataUrl);
  };

  const clear = () => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    onChange("");
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-slate-700 text-sm font-medium">✍️ Your Signature</p>
        <Button
          type="button"
          onClick={clear}
          variant="outline"
          size="sm"
          className="border-slate-300 text-slate-600 hover:bg-slate-50"
        >
          <Eraser className="w-3 h-3 mr-1" />
          Clear
        </Button>
      </div>
      <canvas
        ref={canvasRef}
        width={400}
        height={100}
        onMouseDown={startDrawing}
        onMouseMove={draw}
        onMouseUp={stopDrawing}
        onMouseLeave={stopDrawing}
        className="border-2 border-dashed border-slate-300 rounded-lg bg-white w-full"
        style={{ 
          touchAction: 'none', 
          cursor: 'url("data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%2224%22 height=%2224%22><text x=%220%22 y=%2220%22 font-size=%2220%22>✒️</text></svg>") 0 20, auto'
        }}
      />
    </div>
  );
}