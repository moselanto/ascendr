import { ImageResponse } from "next/og";

/**
 * Social share card for the root route.
 *
 * Generated from JSX at request time rather than shipped as a raster, for two
 * reasons: text stays crisp at any scale, and the card cannot drift out of
 * sync with the homepage copy — change the headline here and the preview
 * changes with it.
 *
 * Next also uses this for twitter:image when no twitter-image file exists, so
 * one file covers both.
 *
 * Deliberately no custom font, so this does NOT render in Manrope. Satori
 * cannot read CSS variables or next/font output; using the brand face here
 * would mean fetching a font binary on every render and adds a failure mode
 * to a decorative asset. The card carries the brand through colour and
 * layout instead.
 */

export const runtime = "edge";
export const alt = "ASCENDR — Your Network. Your Skills. Your Next Opportunity.";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: "#10192F",
          padding: "72px 80px",
        }}
      >
        {/* Wordmark */}
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div
            style={{
              width: 8,
              height: 40,
              background: "#4000F9",
              borderRadius: 4,
              display: "flex",
            }}
          />
          <div
            style={{
              fontSize: 34,
              fontWeight: 800,
              color: "#F7F8FC",
              letterSpacing: "-0.02em",
              display: "flex",
            }}
          >
            ASCENDR
          </div>
        </div>

        {/* Headline */}
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div
            style={{
              fontSize: 72,
              fontWeight: 700,
              color: "#F7F8FC",
              lineHeight: 1.08,
              letterSpacing: "-0.03em",
              display: "flex",
              flexDirection: "column",
            }}
          >
            <span>Your Network. Your Skills.</span>
            {/* brand-300: the logo blue is too dark to read on the navy here,
                so the ramp step that clears 7:1 carries the accent. */}
            <span style={{ color: "#B69EFD" }}>Your Next Opportunity.</span>
          </div>

          <div
            style={{
              marginTop: 28,
              fontSize: 26,
              color: "#94A3B8",
              lineHeight: 1.4,
              maxWidth: 880,
              display: "flex",
            }}
          >
            The AI career intelligence platform that connects your goals, skills, mentors
            and opportunities.
          </div>
        </div>

        {/* Footer rail */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 20,
            fontSize: 21,
            color: "#8293B0",
            fontWeight: 600,
          }}
        >
          <span style={{ display: "flex" }}>Goals</span>
          <span style={{ display: "flex", color: "#3D4C6B" }}>→</span>
          <span style={{ display: "flex" }}>Skills</span>
          <span style={{ display: "flex", color: "#3D4C6B" }}>→</span>
          <span style={{ display: "flex" }}>Mentors</span>
          <span style={{ display: "flex", color: "#3D4C6B" }}>→</span>
          <span style={{ display: "flex" }}>Opportunities</span>
          <span style={{ display: "flex", color: "#3D4C6B" }}>→</span>
          <span style={{ display: "flex", color: "#34D399" }}>Outcomes</span>
        </div>
      </div>
    ),
    { ...size }
  );
}
