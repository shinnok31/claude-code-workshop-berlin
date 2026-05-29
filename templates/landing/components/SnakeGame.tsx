"use client";

import { useEffect, useRef, useState, useCallback } from "react";

const CELL = 12;
const COLS = 28;
const ROWS = 22;
const WIDTH = COLS * CELL;
const HEIGHT = ROWS * CELL;
const SPEED = 150;

type Point = { x: number; y: number };
type Dir = { x: number; y: number };

function randomFood(snake: Point[]): Point {
  let p: Point;
  do {
    p = {
      x: Math.floor(Math.random() * COLS),
      y: Math.floor(Math.random() * ROWS),
    };
  } while (snake.some((s) => s.x === p.x && s.y === p.y));
  return p;
}

export function SnakeGame() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stateRef = useRef({
    snake: [{ x: 14, y: 11 }, { x: 13, y: 11 }, { x: 12, y: 11 }] as Point[],
    dir: { x: 1, y: 0 } as Dir,
    nextDir: { x: 1, y: 0 } as Dir,
    food: { x: 20, y: 11 } as Point,
    score: 0,
    running: false,
    over: false,
    started: false,
  });
  const [displayScore, setDisplayScore] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [newBest, setNewBest] = useState(false);
  const [phase, setPhase] = useState<"idle" | "running" | "over">("idle");
  const loopRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const s = stateRef.current;

    // LCD background
    ctx.fillStyle = "#8bac0f";
    ctx.fillRect(0, 0, WIDTH, HEIGHT);

    // Grid dots (subtle Nokia LCD texture)
    ctx.fillStyle = "#9bbc0f";
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        ctx.fillRect(c * CELL + CELL - 2, r * CELL + CELL - 2, 1, 1);
      }
    }

    // Food — blinking pixel cross
    const f = s.food;
    ctx.fillStyle = "#0f380f";
    ctx.fillRect(f.x * CELL + 2, f.y * CELL + 2, CELL - 4, CELL - 4);

    // Snake
    s.snake.forEach((seg, i) => {
      ctx.fillStyle = "#0f380f";
      if (i === 0) {
        // Head — full block
        ctx.fillRect(seg.x * CELL + 1, seg.y * CELL + 1, CELL - 2, CELL - 2);
        // Eyes
        ctx.fillStyle = "#8bac0f";
        const eyeSize = 2;
        const d = s.dir;
        if (d.x === 1) {
          ctx.fillRect(seg.x * CELL + CELL - 4, seg.y * CELL + 3, eyeSize, eyeSize);
          ctx.fillRect(seg.x * CELL + CELL - 4, seg.y * CELL + CELL - 5, eyeSize, eyeSize);
        } else if (d.x === -1) {
          ctx.fillRect(seg.x * CELL + 2, seg.y * CELL + 3, eyeSize, eyeSize);
          ctx.fillRect(seg.x * CELL + 2, seg.y * CELL + CELL - 5, eyeSize, eyeSize);
        } else if (d.y === -1) {
          ctx.fillRect(seg.x * CELL + 3, seg.y * CELL + 2, eyeSize, eyeSize);
          ctx.fillRect(seg.x * CELL + CELL - 5, seg.y * CELL + 2, eyeSize, eyeSize);
        } else {
          ctx.fillRect(seg.x * CELL + 3, seg.y * CELL + CELL - 4, eyeSize, eyeSize);
          ctx.fillRect(seg.x * CELL + CELL - 5, seg.y * CELL + CELL - 4, eyeSize, eyeSize);
        }
      } else {
        // Body — slightly smaller block
        ctx.fillRect(seg.x * CELL + 2, seg.y * CELL + 2, CELL - 4, CELL - 4);
      }
    });
  }, []);

  const tick = useCallback(() => {
    const s = stateRef.current;
    if (!s.running) return;

    s.dir = s.nextDir;
    const head = s.snake[0];
    const next = { x: head.x + s.dir.x, y: head.y + s.dir.y };

    const endGame = () => {
      s.running = false;
      s.over = true;
      setHighScore((prev) => {
        if (s.score > prev) {
          localStorage.setItem("snake-high-score", String(s.score));
          setNewBest(true);
          return s.score;
        }
        setNewBest(false);
        return prev;
      });
      setPhase("over");
      draw();
    };

    // Wall collision
    if (next.x < 0 || next.x >= COLS || next.y < 0 || next.y >= ROWS) {
      endGame();
      return;
    }

    // Self collision
    if (s.snake.some((seg) => seg.x === next.x && seg.y === next.y)) {
      endGame();
      return;
    }

    const ate = next.x === s.food.x && next.y === s.food.y;
    s.snake = [next, ...s.snake];
    if (ate) {
      s.score += 10;
      setDisplayScore(s.score);
      s.food = randomFood(s.snake);
    } else {
      s.snake.pop();
    }

    draw();
  }, [draw]);

  const startGame = useCallback(() => {
    const s = stateRef.current;
    s.snake = [{ x: 14, y: 11 }, { x: 13, y: 11 }, { x: 12, y: 11 }];
    s.dir = { x: 1, y: 0 };
    s.nextDir = { x: 1, y: 0 };
    s.food = randomFood(s.snake);
    s.score = 0;
    s.running = true;
    s.over = false;
    s.started = true;
    setDisplayScore(0);
    setNewBest(false);
    setPhase("running");

    if (loopRef.current) clearInterval(loopRef.current);
    loopRef.current = setInterval(tick, SPEED);
    draw();
  }, [tick, draw]);

  useEffect(() => {
    const saved = parseInt(localStorage.getItem("snake-high-score") ?? "0", 10);
    if (!isNaN(saved)) setHighScore(saved);
    draw();
    return () => {
      if (loopRef.current) clearInterval(loopRef.current);
    };
  }, [draw]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const s = stateRef.current;
      if (!s.running) return;
      const map: Record<string, Dir> = {
        ArrowUp: { x: 0, y: -1 },
        ArrowDown: { x: 0, y: 1 },
        ArrowLeft: { x: -1, y: 0 },
        ArrowRight: { x: 1, y: 0 },
      };
      const newDir = map[e.key];
      if (!newDir) return;
      // Prevent reversing
      if (newDir.x === -s.dir.x && newDir.y === -s.dir.y) return;
      e.preventDefault();
      s.nextDir = newDir;
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <section style={{ background: "#111827", padding: "4rem 1.5rem" }}>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "1.5rem" }}>

        {/* Nokia phone frame */}
        <div style={{ display: "inline-block", background: "#1a1a1a", borderRadius: "1.5rem", padding: "1.5rem", boxShadow: "0 25px 50px -12px rgba(0,0,0,0.9)", border: "1px solid rgba(255,255,255,0.1)" }}>
          {/* Screen bezel */}
          <div
            className="rounded-xl overflow-hidden border-4 border-[#0a0a0a] shadow-inner"
            style={{ background: "#0f380f" }}
          >
            {/* Score bar */}
            <div
              className="flex justify-between items-center px-3 py-1 text-xs font-mono"
              style={{ background: "#0f380f", color: "#8bac0f" }}
            >
              <span>NOKIA</span>
              <span>{displayScore} / BEST {highScore}</span>
            </div>

            {/* Canvas */}
            <div style={{ position: "relative" }}>
              <canvas
                ref={canvasRef}
                width={WIDTH}
                height={HEIGHT}
                style={{ display: "block", imageRendering: "pixelated" }}
              />

              {/* Overlay for idle / game over */}
              {phase !== "running" && (
                <div
                  style={{
                    position: "absolute",
                    inset: 0,
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    background: "rgba(15, 56, 15, 0.85)",
                  }}
                >
                  {phase === "over" && (
                    <p
                      className="font-mono font-bold text-lg mb-1"
                      style={{ color: "#8bac0f" }}
                    >
                      GAME OVER
                    </p>
                  )}
                  {phase === "over" && (
                    <p className="font-mono text-sm" style={{ color: "#8bac0f" }}>
                      Score: {displayScore}
                    </p>
                  )}
                  {phase === "over" && (
                    <p className="font-mono text-sm mb-1" style={{ color: "#8bac0f" }}>
                      Best: {highScore}
                    </p>
                  )}
                  {phase === "over" && newBest && (
                    <p
                      className="font-mono text-xs font-bold mb-3 px-2 py-0.5 rounded"
                      style={{ background: "#8bac0f", color: "#0f380f" }}
                    >
                      ★ NEW BEST!
                    </p>
                  )}
                  {phase === "over" && !newBest && <div className="mb-3" />}
                  <button
                    onClick={startGame}
                    className="font-mono text-sm px-5 py-2 rounded border-2 transition-colors"
                    style={{
                      borderColor: "#8bac0f",
                      color: "#8bac0f",
                      background: "transparent",
                    }}
                    onMouseOver={(e) => {
                      (e.currentTarget as HTMLButtonElement).style.background = "#8bac0f";
                      (e.currentTarget as HTMLButtonElement).style.color = "#0f380f";
                    }}
                    onMouseOut={(e) => {
                      (e.currentTarget as HTMLButtonElement).style.background = "transparent";
                      (e.currentTarget as HTMLButtonElement).style.color = "#8bac0f";
                    }}
                  >
                    {phase === "idle" ? "▶  START GAME" : "↺  PLAY AGAIN"}
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Nokia buttons row */}
          <div className="flex justify-center gap-3 mt-5">
            <div className="w-3 h-3 rounded-full bg-[#333]" />
            <div className="w-8 h-3 rounded-full bg-[#333]" />
            <div className="w-3 h-3 rounded-full bg-[#333]" />
          </div>
        </div>

        {/* Controls hint */}
        <div style={{ display: "flex", justifyContent: "center", gap: "0.25rem", flexWrap: "wrap" }}>
          {["↑", "↓", "←", "→"].map((k) => (
            <kbd
              key={k}
              style={{
                display: "inline-flex", alignItems: "center", justifyContent: "center",
                width: "2rem", height: "2rem", borderRadius: "0.25rem",
                border: "1px solid rgba(255,255,255,0.2)", background: "rgba(255,255,255,0.05)",
                color: "rgba(255,255,255,0.7)", fontSize: "0.875rem", fontFamily: "monospace",
              }}
            >
              {k}
            </kbd>
          ))}
          <span style={{ color: "rgba(255,255,255,0.4)", fontSize: "0.875rem", marginLeft: "0.5rem", alignSelf: "center" }}>arrow keys</span>
        </div>
      </div>
    </section>
  );
}
