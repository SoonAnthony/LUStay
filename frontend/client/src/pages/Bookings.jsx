import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { fetchBookings } from "../features/bookings/bookingsSlice";
import Footer from "../components/Footer";
import jsPDF from "jspdf";

const INTENT_KEY = "bookings_intent";

const saveIntent = (action, payload = {}) =>
  sessionStorage.setItem(INTENT_KEY, JSON.stringify({ action, payload }));

const popIntent = () => {
  const raw = sessionStorage.getItem(INTENT_KEY);
  if (!raw) return null;
  sessionStorage.removeItem(INTENT_KEY);
  try { return JSON.parse(raw); } catch { return null; }
};

const badgeStyles = {
  CONFIRMED: "bg-lime-50 text-lime-600",
  PENDING:   "bg-amber-50 text-amber-600",
  CANCELLED: "bg-red-50 text-red-400",
};

const fmt = (n) => `KES ${Number(n || 0).toLocaleString()}`;

const fmtDate = (d) =>
  d
    ? new Date(d).toLocaleDateString("en-KE", { day: "numeric", month: "short", year: "numeric" })
    : "-";

const fmtDateTime = (d) =>
  d
    ? new Date(d).toLocaleString("en-KE", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })
    : "-";

const FILTERS = ["ALL", "CONFIRMED", "PENDING", "CANCELLED"];

// ── RECEIPT GENERATOR ─────────────────────────────────
const downloadReceipt = (booking) => {
  const doc = new jsPDF();
  const pageW = doc.internal.pageSize.getWidth();

  // ── Header band ──
  doc.setFillColor(59, 130, 246); // blue-500
  doc.rect(0, 0, pageW, 38, "F");

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(20);
  doc.setFont("helvetica", "bold");
  doc.text("Hostel Booking Receipt", pageW / 2, 18, { align: "center" });

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text("Official Payment Confirmation", pageW / 2, 28, { align: "center" });

  // ── Booking ID badge ──
  doc.setFillColor(239, 246, 255); // blue-50
  doc.roundedRect(14, 45, pageW - 28, 18, 3, 3, "F");
  doc.setTextColor(59, 130, 246);
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text(`Booking ID: #${booking.id?.slice(0, 8).toUpperCase()}`, pageW / 2, 57, { align: "center" });

  // ── Section helper ──
  const section = (label, y) => {
    doc.setFillColor(249, 250, 251); // gray-50
    doc.rect(14, y, pageW - 28, 8, "F");
    doc.setTextColor(107, 114, 128); // gray-500
    doc.setFontSize(8);
    doc.setFont("helvetica", "bold");
    doc.text(label.toUpperCase(), 18, y + 5.5);
    return y + 12;
  };

  // ── Row helper ──
  const row = (label, value, y, highlight = false) => {
    if (highlight) {
      doc.setFillColor(239, 246, 255);
      doc.rect(14, y - 4, pageW - 28, 10, "F");
    }
    doc.setTextColor(107, 114, 128);
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.text(label, 18, y + 2);

    doc.setTextColor(17, 24, 39); // gray-900
    doc.setFont("helvetica", highlight ? "bold" : "normal");
    doc.text(String(value), pageW - 18, y + 2, { align: "right" });

    // divider
    doc.setDrawColor(229, 231, 235);
    doc.line(14, y + 7, pageW - 14, y + 7);

    return y + 12;
  };

  // ── Booking Details ──
  let y = section("Booking Details", 72);
  y = row("Semester",     booking.semester || "-",                            y);
  y = row("Room ID",      booking.room_id?.slice(0, 8).toUpperCase() + "…" || "-", y);
  y = row("Occupancy",    booking.is_shared ? "Shared" : "Single",           y);
  y = row("Status",       booking.status || "-",                              y);
  y = row("Booked On",    fmtDate(booking.created_at),                       y);

  // ── Payment Summary ──
  y = section("Payment Summary", y + 4);
  y = row("Total Price",    fmt(booking.total_price),    y);
  y = row("Deposit Paid",   fmt(booking.deposit_amount), y);
  y = row("Amount Paid",    fmt(booking.amount_paid),    y);
  y = row("Balance Due",    fmt((booking.total_price || 0) - (booking.amount_paid || 0)), y, true);

  // ── M-Pesa reference ──
  if (booking.mpesa_checkout_request_id) {
    y = section("M-Pesa Reference", y + 4);
    y = row("Checkout ID", booking.mpesa_checkout_request_id, y);
  }

  // ── Footer note ──
  y += 10;
  doc.setFillColor(254, 252, 232); // yellow-50
  doc.roundedRect(14, y, pageW - 28, 18, 3, 3, "F");
  doc.setTextColor(161, 98, 7); // yellow-700
  doc.setFontSize(8.5);
  doc.setFont("helvetica", "normal");
  doc.text(
    "This is an automatically generated receipt. Please retain for your records.",
    pageW / 2,
    y + 7,
    { align: "center" }
  );
  doc.text(
    `Generated on ${fmtDateTime(new Date().toISOString())}`,
    pageW / 2,
    y + 13,
    { align: "center" }
  );

  // ── Page border ──
  doc.setDrawColor(229, 231, 235);
  doc.rect(5, 5, pageW - 10, doc.internal.pageSize.getHeight() - 10);

  doc.save(`receipt-${booking.id?.slice(0, 8).toUpperCase()}.pdf`);
};

// ─────────────────────────────────────────────────────

const Bookings = () => {
  const dispatch   = useDispatch();
  const navigate   = useNavigate();
  const { bookings, loading, error } = useSelector((s) => s.bookings);
  const isLoggedIn = useSelector((s) => s.auth.isAuthenticated);

  const [selectedBooking, setSelectedBooking] = useState(null);
  const [activeFilter,    setActiveFilter]    = useState("ALL");

  useEffect(() => {
    if (!isLoggedIn) {
      navigate("/login", { state: { from: { pathname: "/bookings" } }, replace: true });
    }
  }, [isLoggedIn, navigate]);

  useEffect(() => {
    if (!isLoggedIn) return;
    dispatch(fetchBookings());
  }, [dispatch, isLoggedIn]);

  useEffect(() => {
    if (loading || !bookings?.length || !isLoggedIn) return;

    const intent = popIntent();
    if (!intent) return;

    if (intent.action === "view_details") {
      const booking = bookings.find((b) => b.id === intent.payload.bookingId);
      if (booking) setSelectedBooking(booking);
    }

    if (intent.action === "download_receipt") {
      const booking = bookings.find((b) => b.id === intent.payload.bookingId);
      if (booking) downloadReceipt(booking);
    }
  }, [loading, bookings, isLoggedIn]);

  const requireAuth = (action, payload, callback) => {
    if (!isLoggedIn) {
      saveIntent(action, payload);
      navigate("/login", { state: { from: { pathname: "/bookings" } } });
      return;
    }
    callback();
  };

  if (!isLoggedIn) return null;

  const filtered =
    activeFilter === "ALL"
      ? bookings
      : bookings?.filter((b) => b.status === activeFilter);

  const totalSpend   = bookings?.reduce((s, b) => s + (b.total_price    || 0), 0) ?? 0;
  const totalDeposit = bookings?.reduce((s, b) => s + (b.deposit_amount || 0), 0) ?? 0;

  return (
    <>
      <div className="min-h-screen bg-gray-50 pt-24 px-4 pb-16">
        <div className="max-w-4xl mx-auto">

          {/* HEADER */}
          <div className="mb-8">
            <h1 className="text-2xl font-semibold text-gray-900">My Bookings</h1>
            <p className="text-sm text-gray-500 mt-1">
              View and manage your hostel reservations
            </p>
          </div>

          {/* ERROR */}
          {error && (
            <div className="bg-red-50 border border-red-100 text-red-400 text-sm px-4 py-3 rounded-xl mb-6">
              {error}
            </div>
          )}

          {/* STATS */}
          {!loading && bookings?.length > 0 && (
            <div className="grid grid-cols-3 gap-3 mb-6">
              {[
                { label: "Total bookings", value: bookings.length },
                { label: "Total value",    value: fmt(totalSpend) },
                { label: "Total deposits", value: fmt(totalDeposit) },
              ].map(({ label, value }) => (
                <div key={label} className="bg-white border border-gray-100 rounded-2xl p-5">
                  <p className="text-xs text-gray-400 uppercase tracking-wide mb-2">{label}</p>
                  <p className="text-base font-semibold text-gray-900">{value}</p>
                </div>
              ))}
            </div>
          )}

          {/* FILTERS */}
          {!loading && bookings?.length > 0 && (
            <div className="flex gap-2 mb-5 flex-wrap">
              {FILTERS.map((f) => (
                <button
                  key={f}
                  onClick={() => setActiveFilter(f)}
                  className={`text-xs px-4 py-1.5 rounded-full border transition-colors
                    ${activeFilter === f
                      ? "bg-blue-500 text-white border-blue-500"
                      : "bg-white border-gray-200 text-gray-500 hover:bg-gray-50"
                    }`}
                >
                  {f.charAt(0) + f.slice(1).toLowerCase()}
                </button>
              ))}
            </div>
          )}

          {/* LOADING */}
          {loading && (
            <div className="flex flex-col gap-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-28 bg-white border border-gray-100 rounded-2xl animate-pulse" />
              ))}
            </div>
          )}

          {/* EMPTY */}
          {!loading && filtered?.length === 0 && (
            <div className="text-center py-16 bg-white border border-gray-100 rounded-2xl">
              <p className="text-sm text-gray-400">No bookings found.</p>
            </div>
          )}

          {/* LIST */}
          {!loading && (
            <div className="flex flex-col gap-5">
              {filtered?.map((booking) => (
                <div
                  key={booking.id}
                  className="bg-white border border-gray-100 rounded-2xl overflow-hidden"
                >
                  {/* TOP */}
                  <div className="flex items-start justify-between px-5 pt-4 pb-3 border-b border-gray-100">
                    <div>
                      <p className="text-sm font-semibold text-gray-900 font-mono">
                        #{booking.id?.slice(0, 8).toUpperCase()}
                      </p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        Semester {booking.semester}
                      </p>
                    </div>
                    <span
                      className={`text-xs font-medium px-3 py-1 rounded-full ${badgeStyles[booking.status] || "bg-gray-50 text-gray-500"}`}
                    >
                      {booking.status}
                    </span>
                  </div>

                  {/* GRID */}
                  <div className="grid grid-cols-4 divide-x divide-gray-100">
                    <div className="px-5 py-3">
                      <p className="text-xs text-gray-400 uppercase mb-1">Room</p>
                      <p className="text-xs text-gray-700 font-mono">{booking.room_id?.slice(0, 8) || "-"}…</p>
                    </div>
                    <div className="px-5 py-3">
                      <p className="text-xs text-gray-400 uppercase mb-1">Type</p>
                      <span
                        className={`text-xs px-2.5 py-1 rounded-full border inline-block ${
                          booking.is_shared
                            ? "bg-blue-50 text-blue-500 border-blue-100"
                            : "bg-gray-50 text-gray-500 border-gray-100"
                        }`}
                      >
                        {booking.is_shared ? "Shared" : "Single"}
                      </span>
                    </div>
                    <div className="px-5 py-3">
                      <p className="text-xs text-gray-400 uppercase mb-1">Total</p>
                      <p className="text-xs font-semibold text-gray-800">{fmt(booking.total_price)}</p>
                    </div>
                    <div className="px-5 py-3">
                      <p className="text-xs text-gray-400 uppercase mb-1">Deposit</p>
                      <p className="text-xs font-semibold text-gray-800">{fmt(booking.deposit_amount)}</p>
                    </div>
                  </div>

                  {/* FOOTER */}
                  <div className="flex items-center justify-between px-5 py-3 bg-gray-50 border-t border-gray-100">
                    <p className="text-xs text-gray-400">{fmtDate(booking.created_at)}</p>
                    <div className="flex gap-2">
                      <button
                        onClick={() =>
                          requireAuth(
                            "view_details",
                            { bookingId: booking.id },
                            () => setSelectedBooking(booking)
                          )
                        }
                        className="text-sm px-4 py-2 rounded-xl bg-blue-500 hover:bg-blue-600 text-white transition-colors"
                      >
                        View details
                      </button>
                      <button
                        onClick={() =>
                          requireAuth(
                            "download_receipt",
                            { bookingId: booking.id },
                            () => downloadReceipt(booking)  // ✅ real download
                          )
                        }
                        className="text-sm px-4 py-2 rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors"
                      >
                        Receipt
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

        </div>
      </div>

      {/* MODAL */}
      {selectedBooking && (
        <div
          className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50"
          onClick={(e) => e.target === e.currentTarget && setSelectedBooking(null)}
        >
          <div className="bg-white w-full max-w-md rounded-2xl border border-gray-100 p-5">
            <h2 className="text-lg font-semibold mb-4">Booking Details</h2>
            <div className="space-y-2 text-sm text-gray-600">
              <p>ID: {selectedBooking.id}</p>
              <p>Room: {selectedBooking.room_id}</p>
              <p>Semester: {selectedBooking.semester}</p>
              <p>Status: {selectedBooking.status}</p>
              <p>Total: {fmt(selectedBooking.total_price)}</p>
              <p>Deposit: {fmt(selectedBooking.deposit_amount)}</p>
              <p>Amount Paid: {fmt(selectedBooking.amount_paid)}</p>
              <p>Balance Due: {fmt((selectedBooking.total_price || 0) - (selectedBooking.amount_paid || 0))}</p>
              <p>Date: {fmtDateTime(selectedBooking.created_at)}</p>
            </div>
            <div className="flex gap-2 mt-5">
              <button
                onClick={() => downloadReceipt(selectedBooking)}
                className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 py-2 rounded-xl transition-colors text-sm"
              >
                Download Receipt
              </button>
              <button
                onClick={() => setSelectedBooking(null)}
                className="flex-1 bg-blue-500 hover:bg-blue-600 text-white py-2 rounded-xl transition-colors text-sm"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      <Footer />
    </>
  );
};

export default Bookings;