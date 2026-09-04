// src/app/opengraph-image.tsx
// Next.js built-in OG image generation using ImageResponse.
// Automatically served at /opengraph-image (referenced as /og-image.png by meta).
// Ref: https://nextjs.org/docs/app/api-reference/file-conventions/metadata/opengraph-image

import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "NihongoQuest — Master Japanese with smart flashcards";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OgImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "80px",
          background: "linear-gradient(135deg, #0d0d14 0%, #1a1a2e 60%, #12121f 100%)",
          fontFamily: "system-ui, sans-serif",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Background accent circles */}
        <div
          style={{
            position: "absolute", top: -80, right: 200,
            width: 500, height: 500, borderRadius: "50%",
            background: "radial-gradient(circle, rgba(233,69,96,0.12) 0%, transparent 70%)",
          }}
        />
        <div
          style={{
            position: "absolute", bottom: -60, right: -60,
            width: 400, height: 400, borderRadius: "50%",
            background: "radial-gradient(circle, rgba(245,166,35,0.08) 0%, transparent 70%)",
          }}
        />

        {/* Logo mark */}
        <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 32 }}>
          <div
            style={{
              width: 56, height: 56, borderRadius: 14,
              background: "#e94560",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 28, fontWeight: 700, color: "white",
            }}
          >
            日
          </div>
          <span style={{ fontSize: 28, fontWeight: 700, color: "#e94560", letterSpacing: "-0.5px" }}>
            NihongoQuest
          </span>
        </div>

        {/* Main headline */}
        <div style={{ fontSize: 64, fontWeight: 700, color: "#f7f5f0", lineHeight: 1.1, marginBottom: 20 }}>
          Master Japanese.
        </div>
        <div style={{ fontSize: 64, fontWeight: 700, color: "#e94560", lineHeight: 1.1, marginBottom: 32 }}>
          One card at a time.
        </div>

        {/* Tagline */}
        <div style={{ fontSize: 28, color: "#a09880", fontWeight: 400, marginBottom: 48 }}>
          Smart flashcards · Spaced repetition · AI explanations
        </div>

        {/* Feature badges */}
        <div style={{ display: "flex", gap: 16 }}>
          {["JLPT N5–N1", "AI Powered", "Offline Ready", "Free"].map((label) => (
            <div
              key={label}
              style={{
                padding: "10px 24px", borderRadius: 100,
                border: "1px solid rgba(233,69,96,0.3)",
                color: "#e94560", fontSize: 18, fontWeight: 500,
                background: "rgba(233,69,96,0.08)",
              }}
            >
              {label}
            </div>
          ))}
        </div>
      </div>
    ),
    { ...size }
  );
}
