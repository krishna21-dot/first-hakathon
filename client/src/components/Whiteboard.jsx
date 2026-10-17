import { useRef, useEffect, useState, useCallback } from 'react';
import socket from '../lib/socket';

export default function Whiteboard({ roomId, strokes }) {
  const canvasRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [tool, setTool] = useState('pencil'); // pencil, eraser
  const [color, setColor] = useState('#ffffff');
  const [brushSize, setBrushSize] = useState(3);
  const currentStroke = useRef([]);

  const COLORS = ['#ffffff', '#ef4444', '#f59e0b', '#10b981', '#3b82f6', '#8b5cf6', '#ec4899', '#06b6d4'];

  // Draw all strokes
  const redraw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    strokes.forEach((stroke) => {
      drawStroke(ctx, stroke);
    });
  }, [strokes]);

  useEffect(() => {
    redraw();
  }, [redraw]);

  // Resize canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const resize = () => {
      const rect = canvas.parentElement.getBoundingClientRect();
      canvas.width = rect.width;
      canvas.height = 300;
      redraw();
    };

    resize();
    window.addEventListener('resize', resize);
    return () => window.removeEventListener('resize', resize);
  }, [redraw]);

  function drawStroke(ctx, stroke) {
    if (!stroke.points || stroke.points.length < 2) return;

    ctx.beginPath();
    ctx.strokeStyle = stroke.tool === 'eraser' ? 'rgba(10, 14, 23, 0.8)' : stroke.color;
    ctx.lineWidth = stroke.size || 3;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    const canvas = canvasRef.current;
    const firstPt = stroke.points[0];
    ctx.moveTo(firstPt.x * canvas.width, firstPt.y * canvas.height);

    for (let i = 1; i < stroke.points.length; i++) {
      const pt = stroke.points[i];
      ctx.lineTo(pt.x * canvas.width, pt.y * canvas.height);
    }
    ctx.stroke();
  }

  // Listen for remote strokes
  useEffect(() => {
    const onDraw = ({ stroke }) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      drawStroke(ctx, stroke);
    };

    const onClear = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    };

    socket.on('whiteboard-draw', onDraw);
    socket.on('whiteboard-clear', onClear);
    return () => {
      socket.off('whiteboard-draw', onDraw);
      socket.off('whiteboard-clear', onClear);
    };
  }, []);

  const getPos = (e) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    return {
      x: (clientX - rect.left) / canvas.width,
      y: (clientY - rect.top) / canvas.height,
    };
  };

  const startDraw = (e) => {
    e.preventDefault();
    setIsDrawing(true);
    const pos = getPos(e);
    currentStroke.current = [pos];
  };

  const draw = (e) => {
    if (!isDrawing) return;
    e.preventDefault();
    const pos = getPos(e);
    currentStroke.current.push(pos);

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const points = currentStroke.current;

    if (points.length >= 2) {
      ctx.beginPath();
      ctx.strokeStyle = tool === 'eraser' ? 'rgba(10, 14, 23, 0.8)' : color;
      ctx.lineWidth = brushSize;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      const prev = points[points.length - 2];
      const curr = points[points.length - 1];
      ctx.moveTo(prev.x * canvas.width, prev.y * canvas.height);
      ctx.lineTo(curr.x * canvas.width, curr.y * canvas.height);
      ctx.stroke();
    }
  };

  const endDraw = () => {
    if (!isDrawing) return;
    setIsDrawing(false);

    if (currentStroke.current.length >= 2) {
      const stroke = {
        points: currentStroke.current,
        color,
        size: brushSize,
        tool,
      };
      socket.emit('whiteboard-draw', { stroke });
    }
    currentStroke.current = [];
  };

  const handleClear = () => {
    socket.emit('whiteboard-clear');
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
  };

  return (
    <div>
      {/* Toolbar */}
      <div className="flex items-center gap-2 flex-wrap mb-3">
        <button
          onClick={() => setTool('pencil')}
          className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold cursor-pointer border transition-colors ${
            tool === 'pencil' ? 'border-accent bg-accent/20 text-accent' : 'border-border bg-white/5 text-text-muted'
          }`}
        >
          ✏️ Pencil
        </button>
        <button
          onClick={() => setTool('eraser')}
          className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold cursor-pointer border transition-colors ${
            tool === 'eraser' ? 'border-accent bg-accent/20 text-accent' : 'border-border bg-white/5 text-text-muted'
          }`}
        >
          🧹 Eraser
        </button>

        <div className="h-4 w-px bg-border mx-1" />

        {/* Colors */}
        {COLORS.map(c => (
          <button
            key={c}
            onClick={() => { setColor(c); setTool('pencil'); }}
            className="w-5 h-5 rounded-full border-2 cursor-pointer transition-transform hover:scale-110"
            style={{
              backgroundColor: c,
              borderColor: color === c ? '#fff' : 'transparent',
            }}
          />
        ))}

        <div className="h-4 w-px bg-border mx-1" />

        {/* Brush size */}
        <input
          type="range"
          min="1"
          max="20"
          value={brushSize}
          onChange={(e) => setBrushSize(parseInt(e.target.value))}
          className="w-16 accent-accent"
          title={`Brush size: ${brushSize}`}
        />
        <span className="text-xs text-text-dim font-mono">{brushSize}px</span>

        <button
          onClick={handleClear}
          className="ml-auto px-2.5 py-1.5 rounded-lg text-xs font-semibold cursor-pointer border border-bad/30 text-bad bg-transparent hover:bg-bad/10 transition-colors"
        >
          🗑 Clear
        </button>
      </div>

      {/* Canvas */}
      <div className="w-full relative">
        <canvas
          ref={canvasRef}
          className="whiteboard-canvas w-full"
          style={{ height: '300px' }}
          onMouseDown={startDraw}
          onMouseMove={draw}
          onMouseUp={endDraw}
          onMouseLeave={endDraw}
          onTouchStart={startDraw}
          onTouchMove={draw}
          onTouchEnd={endDraw}
        />
      </div>

      <p className="text-[0.7rem] text-text-dim mt-2 text-center">
        🎨 Draw together in real-time — all strokes sync instantly
      </p>
    </div>
  );
}
