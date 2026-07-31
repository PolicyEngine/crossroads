import { ImageResponse } from "next/og";

export const runtime = "edge";

export const alt =
  "Crossroads by PolicyEngine - See how life events affect your taxes and benefits";
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = "image/png";

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          background: "linear-gradient(135deg, #319795, #2C7A7B, #285E61)",
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "Inter, system-ui, sans-serif",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "20px",
            marginBottom: "32px",
          }}
        >
          <div
            style={{
              width: "64px",
              height: "64px",
              background: "rgba(255,255,255,0.2)",
              borderRadius: "16px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <svg
              width="36"
              height="36"
              viewBox="0 0 24 24"
              fill="none"
              stroke="white"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </div>
          <span
            style={{
              color: "white",
              fontSize: "52px",
              fontWeight: 700,
              letterSpacing: "-0.02em",
            }}
          >
            Crossroads
          </span>
        </div>
        <p
          style={{
            color: "rgba(255,255,255,0.9)",
            fontSize: "28px",
            textAlign: "center",
            maxWidth: "700px",
            lineHeight: 1.4,
            margin: 0,
          }}
        >
          See how life events affect your taxes and benefits
        </p>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            marginTop: "48px",
            color: "rgba(255,255,255,0.7)",
            fontSize: "20px",
          }}
        >
          <span>Powered by</span>
          <span style={{ fontWeight: 600, color: "white" }}>PolicyEngine</span>
        </div>
      </div>
    ),
    {
      ...size,
    }
  );
}
