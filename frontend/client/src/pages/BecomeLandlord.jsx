import { useEffect, useRef, useState } from "react";
import { useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import api from "../api/axios";
import Footer from "../components/Footer";

// ── Document config — maps to backend fields exactly ──────────
const DOCS = [
  {
    key:   "title_deed",
    label: "Title Deed",
    desc:  "Official ownership document for the property",
    icon:  "🏛️",
  },
  {
    key:   "lease_agreement",
    label: "Lease Agreement",
    desc:  "A signed agreement granting you rights to sublet",
    icon:  "📋",
  },
  {
    key:   "authorization_letter",
    label: "Authorization Letter",
    desc:  "Letter from the owner authorizing you to manage",
    icon:  "✉️",
  },
];

// ── Upload a single file to Cloudinary via backend ────────────
// Reuses whatever upload endpoint your landlordSlice uses
const uploadFile = async (file) => {
  const formData = new FormData();
  formData.append("file", file);
  const { data } = await api.post("/users/me/upload-document", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return data; // { url, public_id }
};

// ── Single doc upload card ────────────────────────────────────
function DocCard({ doc, state, onFileChange, onUpload, onRemove }) {
  const fileRef = useRef(null);
  const { file, uploaded, uploading, error } = state;

  return (
    <div className={`rounded-2xl border p-5 transition-all ${
      uploaded
        ? "border-emerald-200 bg-emerald-50/40"
        : error
        ? "border-red-200 bg-red-50/30"
        : "border-gray-100 bg-white"
    }`}>
      <div className="flex items-start gap-3 mb-4">
        <span className="text-2xl">{doc.icon}</span>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <p className="text-sm font-semibold text-gray-900">{doc.label}</p>
            {uploaded && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 font-medium">
                ✓ Uploaded
              </span>
            )}
          </div>
          <p className="text-xs text-gray-500 mt-0.5">{doc.desc}</p>
        </div>
      </div>

      {uploaded ? (
        <div className="flex items-center justify-between bg-emerald-100/60 rounded-xl px-3 py-2">
          <span className="text-xs text-emerald-700 truncate max-w-[200px]">{file.name}</span>
          <button
            onClick={onRemove}
            className="text-xs text-red-400 hover:text-red-600 ml-2 shrink-0"
          >
            Remove
          </button>
        </div>
      ) : file ? (
        <div className="space-y-2">
          <div className="flex items-center justify-between bg-gray-50 rounded-xl px-3 py-2">
            <span className="text-xs text-gray-600 truncate max-w-[200px]">{file.name}</span>
            <span className="text-xs text-gray-400 ml-2 shrink-0">
              {(file.size / 1024 / 1024).toFixed(2)} MB
            </span>
          </div>
          <div className="flex gap-2">
            <button
              onClick={onUpload}
              disabled={uploading}
              className="flex-1 flex items-center justify-center gap-2 py-2 bg-blue-500 hover:bg-blue-600 text-white text-xs font-semibold rounded-xl disabled:opacity-60 transition"
            >
              {uploading ? (
                <>
                  <span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Uploading…
                </>
              ) : "Upload"}
            </button>
            <button
              onClick={onRemove}
              className="px-3 py-2 text-xs text-gray-400 hover:text-gray-600 border border-gray-200 rounded-xl transition"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => fileRef.current?.click()}
          className="w-full border-2 border-dashed border-gray-200 hover:border-blue-300 hover:bg-blue-50/30 rounded-xl py-4 text-xs text-gray-400 hover:text-blue-500 transition-all"
        >
          📁 Click to choose file — PDF, JPEG, PNG or WebP
        </button>
      )}

      {error && (
        <p className="mt-2 text-xs text-red-500">{error}</p>
      )}

      <input
        ref={fileRef}
        type="file"
        accept=".pdf,image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={(e) => onFileChange(e.target.files?.[0])}
      />
    </div>
  );
}

// ── Pending screen ────────────────────────────────────────────
const PendingScreen = ({ request }) => (
  <div className="bg-white border border-gray-100 rounded-2xl p-8 text-center">
    <div className="text-4xl mb-4">⏳</div>
    <h2 className="text-lg font-semibold text-gray-900 mb-1">Request under review</h2>
    <p className="text-sm text-gray-500 mb-5">
      Our team is reviewing your documents. This usually takes 1–2 business days.
    </p>
    <div className="inline-flex items-center gap-2 bg-amber-50 border border-amber-100 rounded-xl px-4 py-2">
      <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
      <span className="text-xs text-amber-700 font-medium">Pending review</span>
    </div>
    <p className="text-xs text-gray-400 mt-4">
      Submitted {request?.submitted_at
        ? new Date(request.submitted_at).toLocaleDateString("en-KE", { day: "numeric", month: "short", year: "numeric" })
        : "-"}
    </p>
  </div>
);

// ── Rejected screen ───────────────────────────────────────────
const RejectedScreen = ({ request, onReapply }) => (
  <div className="bg-white border border-gray-100 rounded-2xl p-8 text-center">
    <div className="text-4xl mb-4">❌</div>
    <h2 className="text-lg font-semibold text-gray-900 mb-1">Request rejected</h2>
    <p className="text-sm text-gray-500 mb-4">You may reapply with correct documents.</p>
    {request?.rejection_reason && (
      <div className="bg-red-50 border border-red-100 rounded-xl px-4 py-3 mb-5 text-left">
        <p className="text-xs text-red-500 font-medium mb-1">Reason</p>
        <p className="text-sm text-red-700">{request.rejection_reason}</p>
      </div>
    )}
    <button
      onClick={onReapply}
      className="px-6 py-2.5 bg-blue-500 hover:bg-blue-600 text-white text-sm rounded-xl transition"
    >
      Reapply now
    </button>
  </div>
);

// ── Success screen ────────────────────────────────────────────
const SuccessScreen = ({ onGoProfile }) => (
  <div className="bg-white border border-gray-100 rounded-2xl p-8 text-center">
    <div className="text-4xl mb-4">🎉</div>
    <h2 className="text-lg font-semibold text-gray-900 mb-1">Request submitted!</h2>
    <p className="text-sm text-gray-500 mb-5">
      We've received all your documents. You'll be notified once reviewed.
    </p>
    <button
      onClick={onGoProfile}
      className="px-6 py-2.5 bg-gray-900 hover:bg-gray-800 text-white text-sm rounded-xl transition"
    >
      Back to profile
    </button>
  </div>
);

// ── Initial doc state ─────────────────────────────────────────
const initDocState = () => ({ file: null, uploaded: false, uploading: false, error: null, url: null, public_id: null });

// ── Main page ─────────────────────────────────────────────────
const BecomeLandlord = () => {
  const navigate        = useNavigate();
  const { user, authReady, isAuthenticated } = useSelector((s) => s.auth);

  const [docs, setDocs] = useState({
    title_deed:           initDocState(),
    lease_agreement:      initDocState(),
    authorization_letter: initDocState(),
  });
  const [submitting,   setSubmitting]   = useState(false);
  const [submitError,  setSubmitError]  = useState(null);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [latestRequest, setLatestRequest] = useState(null);
  const [loadingReqs,   setLoadingReqs]   = useState(true);
  const [reapply,       setReapply]       = useState(false);

  // Auth guard
  useEffect(() => {
    if (!authReady) return;
    if (!isAuthenticated) navigate("/login", { replace: true });
  }, [authReady, isAuthenticated, navigate]);

  // Fetch existing requests
  useEffect(() => {
    if (!isAuthenticated) return;
    (async () => {
      try {
        const { data } = await api.get("/users/me/landlord-requests/");
        // Get the most recent request
        const sorted = [...data].sort((a, b) => new Date(b.submitted_at) - new Date(a.submitted_at));
        setLatestRequest(sorted[0] ?? null);
      } catch { /* silent */ }
      finally { setLoadingReqs(false); }
    })();
  }, [isAuthenticated]);

  if (!authReady || !isAuthenticated) return null;

  // Already a landlord
  if (user?.role === "LANDLORD" || user?.role === "ADMIN") {
    return (
      <div className="min-h-screen bg-gray-50 pt-24 px-4 pb-16 flex items-center justify-center">
        <div className="bg-white border border-gray-100 rounded-2xl p-8 text-center max-w-sm w-full">
          <div className="text-3xl mb-3">✅</div>
          <h2 className="text-lg font-semibold text-gray-900 mb-1">You're already a landlord</h2>
          <p className="text-sm text-gray-500 mb-5">No need to apply again.</p>
          <button onClick={() => navigate("/landlord/dashboard")}
            className="px-6 py-2.5 bg-blue-500 hover:bg-blue-600 text-white text-sm rounded-xl transition">
            Go to dashboard
          </button>
        </div>
      </div>
    );
  }

  const hasPending  = latestRequest?.status === "PENDING";
  const hasRejected = latestRequest?.status === "REJECTED";

  // ── Per-doc handlers ────────────────────────────────────────
  const setDoc = (key, patch) =>
    setDocs((prev) => ({ ...prev, [key]: { ...prev[key], ...patch } }));

  const handleFileChange = (key, file) => {
    if (!file) return;
    setDoc(key, { file, uploaded: false, error: null, url: null, public_id: null });
  };

  const handleUpload = async (key) => {
    const { file } = docs[key];
    if (!file) return;
    setDoc(key, { uploading: true, error: null });
    try {
      const result = await uploadFile(file);
      setDoc(key, { uploading: false, uploaded: true, url: result.url, public_id: result.public_id });
    } catch (e) {
      const msg = e?.response?.data?.detail || "Upload failed. Please try again.";
      setDoc(key, { uploading: false, error: typeof msg === "string" ? msg : "Upload failed." });
    }
  };

  const handleRemove = (key) => setDoc(key, initDocState());

  // ── Submit ──────────────────────────────────────────────────
  const allUploaded = DOCS.every((d) => docs[d.key].uploaded);

  const handleSubmit = async () => {
    if (!allUploaded) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      await api.post("/users/me/landlord-requests/", {
        title_deed_url:                    docs.title_deed.url,
        title_deed_public_id:              docs.title_deed.public_id,
        lease_agreement_url:               docs.lease_agreement.url,
        lease_agreement_public_id:         docs.lease_agreement.public_id,
        authorization_letter_url:          docs.authorization_letter.url,
        authorization_letter_public_id:    docs.authorization_letter.public_id,
      });
      setSubmitSuccess(true);
    } catch (e) {
      const detail = e?.response?.data?.detail;
      setSubmitError(typeof detail === "string" ? detail : "Submission failed. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleReapply = () => {
    setReapply(true);
    setDocs({
      title_deed:           initDocState(),
      lease_agreement:      initDocState(),
      authorization_letter: initDocState(),
    });
    setSubmitError(null);
  };

  return (
    <>
      <div className="min-h-screen bg-gray-50 pt-24 px-4 pb-16">
        <div className="max-w-xl mx-auto">

          {/* Header */}
          <div className="mb-6">
            <button onClick={() => navigate("/profile")}
              className="text-xs text-gray-400 hover:text-gray-600 mb-3 flex items-center gap-1 transition">
              ← Back to profile
            </button>
            <h1 className="text-2xl font-semibold text-gray-900">Become a Landlord</h1>
            <p className="text-sm text-gray-500 mt-1">
              Upload all three documents to verify your property ownership or management rights.
            </p>
          </div>

          {/* Loading */}
          {loadingReqs && (
            <div className="bg-white border border-gray-100 rounded-2xl p-8 flex justify-center">
              <div className="w-8 h-8 border-2 border-blue-200 border-t-blue-500 rounded-full animate-spin" />
            </div>
          )}

          {/* Status screens */}
          {!loadingReqs && submitSuccess && (
            <SuccessScreen onGoProfile={() => navigate("/profile")} />
          )}

          {!loadingReqs && !submitSuccess && hasPending && (
            <PendingScreen request={latestRequest} />
          )}

          {!loadingReqs && !submitSuccess && hasRejected && !reapply && (
            <RejectedScreen request={latestRequest} onReapply={handleReapply} />
          )}

          {/* Main form */}
          {!loadingReqs && !submitSuccess && !hasPending && (!hasRejected || reapply) && (
            <div className="space-y-4">
              {/* Progress indicator */}
              <div className="flex items-center gap-2 bg-white border border-gray-100 rounded-2xl px-5 py-3">
                {DOCS.map((doc, i) => (
                  <div key={doc.key} className="flex items-center gap-2 flex-1">
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 transition-colors ${
                      docs[doc.key].uploaded
                        ? "bg-emerald-500 text-white"
                        : "bg-gray-100 text-gray-400"
                    }`}>
                      {docs[doc.key].uploaded ? "✓" : i + 1}
                    </div>
                    <span className={`text-xs font-medium hidden sm:block ${
                      docs[doc.key].uploaded ? "text-emerald-600" : "text-gray-400"
                    }`}>
                      {doc.label}
                    </span>
                    {i < DOCS.length - 1 && (
                      <div className={`flex-1 h-px mx-1 ${docs[doc.key].uploaded ? "bg-emerald-200" : "bg-gray-100"}`} />
                    )}
                  </div>
                ))}
              </div>

              {/* Document cards */}
              {DOCS.map((doc) => (
                <DocCard
                  key={doc.key}
                  doc={doc}
                  state={docs[doc.key]}
                  onFileChange={(file) => handleFileChange(doc.key, file)}
                  onUpload={() => handleUpload(doc.key)}
                  onRemove={() => handleRemove(doc.key)}
                />
              ))}

              {/* Disclaimer */}
              <div className="bg-blue-50 border border-blue-100 rounded-xl px-4 py-3 text-xs text-blue-600">
                By submitting, you confirm all documents are authentic and belong to you or your organization.
              </div>

              {submitError && (
                <div className="bg-red-50 border border-red-100 text-red-500 text-xs px-4 py-3 rounded-xl">
                  {submitError}
                </div>
              )}

              {/* Submit button */}
              <button
                onClick={handleSubmit}
                disabled={!allUploaded || submitting}
                className="w-full py-3 bg-gray-900 hover:bg-gray-800 text-white text-sm font-semibold rounded-xl transition disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {submitting ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Submitting…
                  </>
                ) : allUploaded ? "Submit all documents →" : `Upload all 3 documents to continue`}
              </button>
            </div>
          )}

        </div>
      </div>
      <Footer />
    </>
  );
};

export default BecomeLandlord;