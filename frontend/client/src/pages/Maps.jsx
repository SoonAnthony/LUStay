import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { MapContainer, TileLayer, Marker, useMap } from "react-leaflet";
import L from "leaflet";
import api from "../api/axios";
import "../utils/fixLeafletIcon";

// ── Google Fonts ──────────────────────────────────────────────
const fontLink = document.createElement("link");
fontLink.rel = "stylesheet";
fontLink.href =
  "https://fonts.googleapis.com/css2?family=Sora:wght@400;600;700;800&family=DM+Sans:wght@400;500;600;700&display=swap";
document.head.appendChild(fontLink);

// ── Constants ────────────────────────────────────────────────
const LU_CENTER    = [-0.3031, 36.782];
const LU_COORDS    = [0.029445, 36.273985];
const INIT_ZOOM    = 9;
const KENYA_BOUNDS = [[-4.8, 33.9], [5.0, 41.9]];

// ── Helpers ──────────────────────────────────────────────────
const primaryImage = (h) =>
  h.images?.find((i) => i.is_primary)?.image_url ?? h.images?.[0]?.image_url ?? null;

const lowestPrice = (h) => {
  const prices = (h.room_types ?? [])
    .flatMap((rt) => [rt.price_single, rt.price_double])
    .filter(Boolean);
  return prices.length ? Math.min(...prices) : null;
};

const distKm = (lat1, lon1, lat2, lon2) => {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  return (R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))).toFixed(1);
};

// ── Marker icon ───────────────────────────────────────────────
const makeIcon = (name, selected) =>
  L.divIcon({
    className: "",
    iconAnchor: [0, 46],
    html: `
      <div style="display:flex;flex-direction:column;align-items:center;gap:4px;filter:drop-shadow(0 4px 14px rgba(0,0,0,.22))">
        <div style="
          background:${selected ? "#2563EB" : "#ffffff"};
          color:${selected ? "#ffffff" : "#2563EB"};
          border:2px solid ${selected ? "#2563EB" : "#bfdbfe"};
          font-size:11.5px;font-weight:700;
          font-family:'DM Sans',system-ui,sans-serif;
          padding:5px 13px;border-radius:999px;
          white-space:nowrap;max-width:180px;
          overflow:hidden;text-overflow:ellipsis;
          box-shadow:0 2px 10px rgba(37,99,235,.18);
          letter-spacing:-0.01em;
        ">${name}</div>
        <div style="
          width:11px;height:11px;
          background:${selected ? "#2563EB" : "#3b82f6"};
          border:3px solid white;border-radius:50%;
          box-shadow:0 2px 6px rgba(0,0,0,.22);
          ${selected ? "animation:pulse 1.6s ease-out infinite;" : ""}
        "></div>
      </div>`,
  });

// ── LU Campus marker icon ─────────────────────────────────────
const luIcon = L.divIcon({
  className: "",
  iconAnchor: [16, 44],
  html: `
    <div style="display:flex;flex-direction:column;align-items:center;gap:4px;filter:drop-shadow(0 4px 14px rgba(0,0,0,.3))">
      <div style="
        background:#dc2626;color:#ffffff;
        border:2px solid #ffffff;
        font-size:11px;font-weight:800;
        font-family:'DM Sans',system-ui,sans-serif;
        padding:5px 11px;border-radius:999px;
        white-space:nowrap;letter-spacing:0.02em;
        box-shadow:0 2px 10px rgba(220,38,38,.4);
      ">🎓 Laikipia University</div>
      <div style="
        width:13px;height:13px;
        background:#dc2626;
        border:3px solid white;border-radius:50%;
        box-shadow:0 2px 6px rgba(220,38,38,.4);
      "></div>
    </div>`,
});

// ── Map helpers ───────────────────────────────────────────────
const Setup = () => {
  const map = useMap();
  useEffect(() => {
    map.setMaxBounds(KENYA_BOUNDS);
    map.setMinZoom(6);
    map.on("drag", () => map.panInsideBounds(KENYA_BOUNDS, { animate: false }));
  }, [map]);
  return null;
};

const FlyTo = ({ hostel }) => {
  const map = useMap();
  useEffect(() => {
    if (!hostel?.latitude || !hostel?.longitude) return;
    map.flyTo([hostel.latitude, hostel.longitude], 14, { animate: true, duration: 1 });
  }, [hostel, map]);
  return null;
};

// ── Desktop Hostel Card ───────────────────────────────────────
const SidebarCard = ({ hostel, selected, onClick }) => {
  const img   = primaryImage(hostel);
  const price = lowestPrice(hostel);
  const dist  = hostel.latitude
    ? distKm(LU_COORDS[0], LU_COORDS[1], hostel.latitude, hostel.longitude)
    : null;
  const sel = selected?.id === hostel.id;

  return (
    <button
      onClick={onClick}
      style={{
        width: "100%",
        display: "block",
        textAlign: "left",
        border: `${sel ? 2 : 1.5}px solid ${sel ? "#2563EB" : "#f0f0f0"}`,
        borderRadius: 18,
        overflow: "visible",
        background: sel ? "#EFF6FF" : "#ffffff",
        cursor: "pointer",
        padding: 0,
        boxShadow: sel
          ? "0 8px 24px rgba(37,99,235,.13)"
          : "0 2px 8px rgba(0,0,0,.05)",
        transition: "all .18s ease",
      }}
      onMouseEnter={(e) => {
        if (!sel) {
          e.currentTarget.style.boxShadow = "0 8px 24px rgba(0,0,0,.1)";
          e.currentTarget.style.transform = "translateY(-1px)";
        }
      }}
      onMouseLeave={(e) => {
        if (!sel) {
          e.currentTarget.style.boxShadow = "0 2px 8px rgba(0,0,0,.05)";
          e.currentTarget.style.transform = "translateY(0)";
        }
      }}
    >
      {img && (
        <div style={{
          height: 130, overflow: "hidden", position: "relative",
          borderRadius: "18px 18px 0 0",   /* clip only the image corners */
        }}>
          <img
            src={img}
            alt={hostel.name}
            style={{ width: "100%", height: "100%", objectFit: "cover", transition: "transform .3s ease" }}
            onMouseEnter={(e) => { e.currentTarget.style.transform = "scale(1.04)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.transform = "scale(1)"; }}
          />
        </div>
      )}
      <div style={{ padding: "11px 14px 13px" }}>
        <p style={{
          fontSize: 13.5, fontWeight: 700, color: "#111827",
          margin: 0, overflow: "hidden", textOverflow: "ellipsis",
          whiteSpace: "nowrap", fontFamily: "'Sora', sans-serif",
          letterSpacing: "-0.02em",
        }}>
          {hostel.name}
        </p>
        <p style={{
          fontSize: 11.5, color: "#9ca3af", margin: "3px 0 0",
          overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
          fontFamily: "'DM Sans', sans-serif",
        }}>
          📍 {hostel.location}
        </p>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 5, marginTop: 8 }}>
          <span style={{
            fontSize: 11, fontWeight: 600, color: "#16a34a",
            background: "#F0FDF4", border: "1px solid #bbf7d0",
            padding: "3px 9px", borderRadius: 999,
            fontFamily: "'DM Sans', sans-serif",
          }}>
            {dist ? `${dist} km from LU` : "Near LU"}
          </span>
          {price && (
            <span style={{
              fontSize: 11, fontWeight: 700, color: "#2563EB",
              background: "#EFF6FF", border: "1px solid #bfdbfe",
              padding: "3px 9px", borderRadius: 999,
              fontFamily: "'DM Sans', sans-serif",
            }}>
              From KSh {price.toLocaleString()}
            </span>
          )}
        </div>
        {hostel.amenities?.length > 0 && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginTop: 7 }}>
            {hostel.amenities.slice(0, 3).map((a) => (
              <span key={a.id} style={{
                fontSize: 10.5, color: "#6B7280",
                background: "#f9fafb", border: "1px solid #f0f0f0",
                padding: "2px 8px", borderRadius: 999,
                fontFamily: "'DM Sans', sans-serif",
              }}>
                {a.name}
              </span>
            ))}
            {hostel.amenities.length > 3 && (
              <span style={{ fontSize: 10.5, color: "#9ca3af", padding: "2px 4px" }}>
                +{hostel.amenities.length - 3}
              </span>
            )}
          </div>
        )}
      </div>
    </button>
  );
};

// ── Mobile Bottom Sheet ───────────────────────────────────────
const BottomSheet = ({ hostel, onClose, onView }) => {
  const img   = primaryImage(hostel);
  const price = lowestPrice(hostel);
  const dist  = hostel.latitude
    ? distKm(LU_COORDS[0], LU_COORDS[1], hostel.latitude, hostel.longitude)
    : null;

  return (
    <>
      {/* Scrim */}
      <div
        onClick={onClose}
        style={{
          position: "fixed", inset: 0, zIndex: 600,
          background: "rgba(0,0,0,.35)",
          animation: "fadeIn .2s ease both",
        }}
      />
      {/* Sheet */}
      <div
        style={{
          position: "fixed", bottom: 0, left: 0, right: 0,
          zIndex: 610, background: "#ffffff",
          borderRadius: "28px 28px 0 0",
          boxShadow: "0 -8px 40px rgba(0,0,0,.18)",
          animation: "sheetUp .32s cubic-bezier(.32,1.2,.5,1) both",
          fontFamily: "'DM Sans', sans-serif",
        }}
      >
        {/* Drag handle */}
        <div style={{ display: "flex", justifyContent: "center", padding: "14px 0 8px" }}>
          <div style={{ width: 40, height: 4, background: "#e5e7eb", borderRadius: 99 }} />
        </div>

        {img && (
          <div style={{ margin: "0 16px 0", borderRadius: 18, overflow: "hidden", height: 192 }}>
            <img src={img} alt={hostel.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          </div>
        )}

        <div style={{ padding: "14px 20px 36px" }}>
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
            <div style={{ minWidth: 0 }}>
              <h2 style={{
                fontSize: 18, fontWeight: 800, color: "#111827",
                margin: 0, letterSpacing: "-0.03em",
                fontFamily: "'Sora', sans-serif",
                overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
              }}>
                {hostel.name}
              </h2>
              <p style={{ fontSize: 13, color: "#6B7280", margin: "4px 0 0" }}>
                📍 {hostel.location}
              </p>
            </div>
            <button
              onClick={onClose}
              style={{
                flexShrink: 0, width: 32, height: 32,
                display: "flex", alignItems: "center", justifyContent: "center",
                borderRadius: "50%", background: "#f3f4f6",
                border: "none", color: "#6B7280", cursor: "pointer",
                fontSize: 14, fontWeight: 600,
              }}
            >
              ✕
            </button>
          </div>

          <div style={{ display: "flex", flexWrap: "wrap", gap: 7, marginTop: 12 }}>
            {dist && (
              <span style={{
                fontSize: 12.5, fontWeight: 600, color: "#16a34a",
                background: "#F0FDF4", border: "1px solid #bbf7d0",
                padding: "4px 12px", borderRadius: 999,
              }}>
                {dist} km from LU
              </span>
            )}
            {price && (
              <span style={{
                fontSize: 12.5, fontWeight: 700, color: "#2563EB",
                background: "#EFF6FF", border: "1px solid #bfdbfe",
                padding: "4px 12px", borderRadius: 999,
              }}>
                From KSh {price.toLocaleString()}
              </span>
            )}
          </div>

          {hostel.amenities?.length > 0 && (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 10 }}>
              {hostel.amenities.slice(0, 5).map((a) => (
                <span key={a.id} style={{
                  fontSize: 11.5, color: "#6B7280",
                  background: "#f9fafb", border: "1px solid #f0f0f0",
                  padding: "3px 10px", borderRadius: 999,
                }}>
                  {a.name}
                </span>
              ))}
              {hostel.amenities.length > 5 && (
                <span style={{ fontSize: 11.5, color: "#9ca3af", padding: "3px 4px" }}>
                  +{hostel.amenities.length - 5} more
                </span>
              )}
            </div>
          )}

          <button
            onClick={() => onView(hostel.id)}
            style={{
              marginTop: 18, width: "100%", padding: "15px 0",
              background: "#2563EB", color: "#ffffff",
              border: "none", borderRadius: 18,
              fontSize: 14.5, fontWeight: 700, cursor: "pointer",
              fontFamily: "'DM Sans', sans-serif", letterSpacing: "-0.01em",
              boxShadow: "0 6px 20px rgba(37,99,235,.3)",
              transition: "background .15s, transform .1s",
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = "#1d4ed8"; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = "#2563EB"; }}
            onMouseDown={(e) => { e.currentTarget.style.transform = "scale(.98)"; }}
            onMouseUp={(e) => { e.currentTarget.style.transform = "scale(1)"; }}
          >
            View Hostel →
          </button>
        </div>
      </div>
    </>
  );
};

// ══════════════════════════════════════════════════════════════
// MAIN
// ══════════════════════════════════════════════════════════════
export default function Maps() {
  const navigate = useNavigate();
  const [hostels,  setHostels]  = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState(null);
  const [selected, setSelected] = useState(null);
  const [search,   setSearch]   = useState("");

  useEffect(() => {
    (async () => {
      try {
        const res  = await api.get("/hostels/");
        const data = res.data.hostels ?? res.data;
        setHostels(
          data.filter(
            (h) =>
              h.latitude != null &&
              h.longitude != null &&
              h.status?.toUpperCase() === "APPROVED"
          )
        );
      } catch {
        setError("Failed to load hostels. Please try again.");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const filtered = hostels.filter(
    (h) =>
      h.name.toLowerCase().includes(search.toLowerCase()) ||
      h.location?.toLowerCase().includes(search.toLowerCase())
  );

  const select   = useCallback((h) => setSelected((p) => (p?.id === h?.id ? null : h)), []);
  const deselect = useCallback(() => setSelected(null), []);

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Sora:wght@400;600;700;800&family=DM+Sans:wght@400;500;600;700&display=swap');

        @keyframes sheetUp {
          from { transform: translateY(100%); opacity: 0; }
          to   { transform: translateY(0);    opacity: 1; }
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        @keyframes pulse {
          0%   { box-shadow: 0 0 0 0 rgba(37,99,235,.5); }
          70%  { box-shadow: 0 0 0 8px rgba(37,99,235,0); }
          100% { box-shadow: 0 0 0 0 rgba(37,99,235,0); }
        }

        .lustay-no-scroll::-webkit-scrollbar { display: none; }
        .lustay-no-scroll { -ms-overflow-style: none; scrollbar-width: none; }

        /* Remove Leaflet's default focus ring noise */
        .leaflet-container { font-family: 'DM Sans', sans-serif !important; }
      `}</style>

      <div style={{
        position: "fixed", inset: 0,
        paddingTop: 64,
        display: "flex",
        fontFamily: "'DM Sans', sans-serif",
      }}>

        {/* ── Loading ── */}
        {loading ? (
          <div style={{
            flex: 1, display: "flex", alignItems: "center",
            justifyContent: "center", background: "#f8fafc",
          }}>
            <div style={{ textAlign: "center" }}>
              <div style={{
                width: 34, height: 34,
                border: "3px solid #2563EB",
                borderTopColor: "transparent",
                borderRadius: "50%",
                animation: "spin .8s linear infinite",
                margin: "0 auto 14px",
              }} />
              <p style={{
                fontSize: 13.5, color: "#9ca3af",
                fontFamily: "'DM Sans', sans-serif",
              }}>
                Loading map…
              </p>
            </div>
          </div>

        /* ── Error ── */
        ) : error ? (
          <div style={{
            flex: 1, display: "flex", alignItems: "center",
            justifyContent: "center", background: "#f8fafc",
          }}>
            <p style={{ fontSize: 14, color: "#ef4444" }}>{error}</p>
          </div>

        /* ── Map layout ── */
        ) : (
          <div style={{ flex: 1, position: "relative", minHeight: 0 }}>

            {/* Full-screen map */}
            <MapContainer
              center={LU_CENTER}
              zoom={INIT_ZOOM}
              style={{
                position: "absolute", top: 0, left: 0, right: 0, bottom: 0,
                width: "100%", height: "100%",
              }}
              maxBounds={KENYA_BOUNDS}
              maxBoundsViscosity={0.8}
              zoomControl={false}
            >
              <TileLayer
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              />
              <Setup />
              <FlyTo hostel={selected} />

              {/* LU Campus anchor marker */}
              <Marker position={LU_COORDS} icon={luIcon} />

              {filtered.map((h) => (
                <Marker
                  key={h.id}
                  position={[h.latitude, h.longitude]}
                  icon={makeIcon(h.name, selected?.id === h.id)}
                  eventHandlers={{ click: () => select(h) }}
                />
              ))}
            </MapContainer>

            {/* ── Desktop Left Sidebar (380px, opaque white) ── */}
            <div
              style={{
                display: "none",
                position: "absolute", top: 0, left: 0, bottom: 0,
                zIndex: 400, width: 380,
                flexDirection: "column",
                background: "#ffffff",
                borderRight: "1.5px solid #f0f0f0",
                boxShadow: "4px 0 32px rgba(0,0,0,.07)",
              }}
              className="lustay-sidebar"
            >
              {/* Sidebar header */}
              <div style={{
                padding: "20px 20px 16px",
                borderBottom: "1px solid #f5f5f5",
              }}>
                <h1 style={{
                  fontSize: 17, fontWeight: 800, color: "#111827",
                  margin: 0, fontFamily: "'Sora', sans-serif",
                  letterSpacing: "-0.03em",
                }}>
                  Hostel Map
                </h1>
                <p style={{
                  fontSize: 12.5, color: "#9ca3af",
                  margin: "3px 0 0", fontFamily: "'DM Sans', sans-serif",
                }}>
                  Around Laikipia University
                </p>
                <p style={{
                  fontSize: 12.5, fontWeight: 600, color: "#2563EB",
                  margin: "6px 0 0", fontFamily: "'DM Sans', sans-serif",
                }}>
                  {filtered.length} hostel{filtered.length !== 1 ? "s" : ""} found
                </p>
              </div>

              {/* Search bar inside sidebar */}
              <div style={{ padding: "14px 16px 10px" }}>
                <div style={{
                  display: "flex", alignItems: "center", gap: 8,
                  background: "#f8fafc", borderRadius: 14,
                  border: "1.5px solid #f0f0f0",
                  padding: "9px 13px",
                  transition: "border-color .15s",
                }}>
                  <span style={{ fontSize: 14, color: "#9ca3af", flexShrink: 0 }}>🔍</span>
                  <input
                    type="text"
                    placeholder="Search hostel or area…"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    style={{
                      flex: 1, border: "none", outline: "none",
                      fontSize: 13.5, color: "#374151",
                      background: "transparent",
                      fontFamily: "'DM Sans', sans-serif",
                    }}
                    onFocus={(e) => {
                      e.currentTarget.parentElement.style.borderColor = "#2563EB";
                    }}
                    onBlur={(e) => {
                      e.currentTarget.parentElement.style.borderColor = "#f0f0f0";
                    }}
                  />
                  {search && (
                    <button
                      onClick={() => setSearch("")}
                      style={{
                        fontSize: 12, color: "#d1d5db",
                        cursor: "pointer", background: "none", border: "none", padding: 0,
                      }}
                    >
                      ✕
                    </button>
                  )}
                </div>
              </div>

              {/* Card list */}
              <div
                className="lustay-no-scroll"
                style={{
                  flex: 1, overflowY: "auto",
                  padding: "4px 14px 14px",
                  display: "flex", flexDirection: "column", gap: 10,
                }}
              >
                {filtered.length === 0 ? (
                  <div style={{
                    flex: 1, display: "flex", alignItems: "center",
                    justifyContent: "center", padding: "60px 0",
                  }}>
                    <p style={{ fontSize: 13, color: "#9ca3af", textAlign: "center" }}>
                      No hostels match your search.
                    </p>
                  </div>
                ) : (
                  filtered.map((h) => (
                    <SidebarCard
                      key={h.id}
                      hostel={h}
                      selected={selected}
                      onClick={() => select(h)}
                    />
                  ))
                )}
              </div>

              {/* View hostel CTA */}
              {selected && (
                <div style={{
                  padding: "12px 14px 16px",
                  borderTop: "1px solid #f5f5f5",
                }}>
                  <button
                    onClick={() => navigate(`/hostels/${selected.id}`)}
                    style={{
                      width: "100%", padding: "14px 0",
                      background: "#2563EB", color: "#ffffff",
                      border: "none", borderRadius: 16,
                      fontSize: 14, fontWeight: 700, cursor: "pointer",
                      fontFamily: "'DM Sans', sans-serif",
                      letterSpacing: "-0.01em",
                      boxShadow: "0 6px 20px rgba(37,99,235,.28)",
                      transition: "background .15s, transform .1s",
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = "#1d4ed8"; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = "#2563EB"; }}
                    onMouseDown={(e) => { e.currentTarget.style.transform = "scale(.98)"; }}
                    onMouseUp={(e) => { e.currentTarget.style.transform = "scale(1)"; }}
                  >
                    View {selected.name} →
                  </button>
                </div>
              )}
            </div>

            {/* ── Mobile floating search bar ── */}
            <div
              className="lustay-mobile-search"
              style={{
                display: "none",
                position: "absolute", top: 12, left: "50%",
                transform: "translateX(-50%)",
                zIndex: 400, width: "100%", maxWidth: 400,
                padding: "0 16px",
              }}
            >
              <div style={{
                display: "flex", alignItems: "center", gap: 8,
                background: "#ffffff", borderRadius: 18,
                boxShadow: "0 4px 24px rgba(0,0,0,.13)",
                border: "1.5px solid #f0f0f0",
                padding: "11px 15px",
              }}>
                <span style={{ fontSize: 14, color: "#9ca3af", flexShrink: 0 }}>🔍</span>
                <input
                  type="text"
                  placeholder="Search hostel or area…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  style={{
                    flex: 1, border: "none", outline: "none",
                    fontSize: 14, color: "#374151", background: "transparent",
                    fontFamily: "'DM Sans', sans-serif",
                  }}
                />
                {search && (
                  <button
                    onClick={() => setSearch("")}
                    style={{
                      fontSize: 12, color: "#d1d5db",
                      cursor: "pointer", background: "none", border: "none",
                    }}
                  >
                    ✕
                  </button>
                )}
              </div>
            </div>

            {/* ── Mobile horizontal card strip ── */}
            {filtered.length > 0 && (
              <div
                className="lustay-mobile-strip lustay-no-scroll"
                style={{
                  display: "none",
                  position: "absolute", bottom: 20, left: 0, right: 0,
                  zIndex: 400,
                  overflowX: "auto",
                  padding: "0 14px",
                  scrollSnapType: "x mandatory",
                  gap: 10,
                }}
              >
                {filtered.map((h) => {
                  const price = lowestPrice(h);
                  const img   = primaryImage(h);
                  const dist  = h.latitude
                    ? distKm(LU_COORDS[0], LU_COORDS[1], h.latitude, h.longitude)
                    : null;
                  const sel   = selected?.id === h.id;
                  return (
                    <button
                      key={h.id}
                      onClick={() => select(h)}
                      style={{
                        scrollSnapAlign: "start", flexShrink: 0,
                        display: "flex", alignItems: "center", gap: 10,
                        padding: "10px 13px",
                        background: sel ? "#EFF6FF" : "#ffffff",
                        border: `${sel ? 2 : 1.5}px solid ${sel ? "#2563EB" : "#f0f0f0"}`,
                        borderRadius: 18, cursor: "pointer",
                        boxShadow: sel
                          ? "0 6px 20px rgba(37,99,235,.14)"
                          : "0 4px 18px rgba(0,0,0,.1)",
                        fontFamily: "'DM Sans', sans-serif",
                      }}
                    >
                      {img && (
                        <img
                          src={img}
                          alt={h.name}
                          style={{
                            width: 44, height: 44, borderRadius: 12,
                            objectFit: "cover", flexShrink: 0,
                          }}
                        />
                      )}
                      <div style={{ textAlign: "left", minWidth: 0 }}>
                        <p style={{
                          fontSize: 12.5, fontWeight: 700, color: "#111827",
                          margin: 0, whiteSpace: "nowrap",
                          maxWidth: 130, overflow: "hidden", textOverflow: "ellipsis",
                          fontFamily: "'Sora', sans-serif", letterSpacing: "-0.02em",
                        }}>
                          {h.name}
                        </p>
                        {dist && (
                          <p style={{
                            fontSize: 10.5, color: "#16a34a",
                            fontWeight: 600, margin: "2px 0 0",
                          }}>
                            {dist} km from LU
                          </p>
                        )}
                        <p style={{
                          fontSize: 10.5,
                          color: price ? "#2563EB" : "#9ca3af",
                          fontWeight: price ? 700 : 400,
                          margin: "1px 0 0",
                        }}>
                          {price ? `From KSh ${price.toLocaleString()}` : "Tap for details"}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}

          </div>
        )}
      </div>

      {/* Mobile bottom sheet */}
      {selected && (
        <div className="lustay-bottom-sheet">
          <BottomSheet
            hostel={selected}
            onClose={deselect}
            onView={(id) => navigate(`/hostels/${id}`)}
          />
        </div>
      )}

      {/* ── Responsive CSS ── */}
      <style>{`
        /* Desktop: show sidebar, hide mobile elements */
        @media (min-width: 1024px) {
          .lustay-sidebar          { display: flex !important; }
          .lustay-mobile-search    { display: none  !important; }
          .lustay-mobile-strip     { display: none  !important; }
          .lustay-bottom-sheet     { display: none  !important; }
        }

        /* Mobile: hide sidebar, show mobile elements */
        @media (max-width: 1023px) {
          .lustay-sidebar          { display: none  !important; }
          .lustay-mobile-search    { display: flex  !important; }
          .lustay-mobile-strip     { display: flex  !important; }
          .lustay-bottom-sheet     { display: block !important; }
        }
      `}</style>
    </>
  );
}