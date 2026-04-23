import { useEffect, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import {
  uploadLandlordDocument,
  submitLandlordRequest,
  fetchMyLandlordRequests,
  resetLandlordForm,
  clearUpload,
} from "../features/landlord/landlordSlice";
import Footer from "../components/Footer";

// ── DOCUMENT TYPE CONFIG ──────────────────────────────────────
const DOC_TYPES = [
  {
    value: "TITLE_DEED",
    label: "Title Deed",
    desc:  "Official ownership document for the property",
    icon:  "🏛️",
  },
  {
    value: "LEASE_AGREEMENT",
    label: "Lease Agreement",
    desc:  "A signed agreement granting you rights to sublet",
    icon:  "📋",
  },
  {
    value: "AUTHORIZATION_LETTER",
    label: "Authorization Letter",
    desc:  "Letter from the owner authorizing you to manage",
    icon:  "✉️",
  },
];

// ── STEP INDICATOR ────────────────────────────────────────────
const Steps = ({ current }) => {
  const steps = ["Choose document", "Upload file", "Submit"];
  return (
    <div className="flex items-center gap-2 mb-8">
      {steps.map((label, i) => {
        const idx    = i + 1;
        const done   = idx < current;
        const active = idx === current;
        return (
          <div key={label} className="flex items-center gap-2">
            <div className="flex items-center gap-2">
              <div
                className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-semibold transition-colors
                  ${done   ? "bg-lime-500 text-white"
                  : active ? "bg-blue-500 text-white"
                  :          "bg-gray-100 text-gray-400"}`}
              >
                {done ? "✓" : idx}
              </div>
              <span
                className={`text-xs font-medium hidden sm:block transition-colors
                  ${active ? "text-gray-900" : "text-gray-400"}`}
              >
                {label}
              </span>
            </div>
            {i < steps.length - 1 && (
              <div className={`w-8 h-px mx-1 ${done ? "bg-lime-300" : "bg-gray-200"}`} />
            )}
          </div>
        );
      })}
    </div>
  );
};

// ── STATUS SCREENS ────────────────────────────────────────────
const PendingScreen = ({ request }) => (
  <div className="bg-white border border-gray-100 rounded-2xl p-8 text-center">
    <div className="w-14 h-14 rounded-2xl bg-amber-50 flex items-center justify-center mx-auto mb-4 text-2xl">
      ⏳
    </div>
    <h2 className="text-lg font-semibold text-gray-900 mb-1">Request under review</h2>
    <p className="text-sm text-gray-500 mb-5">
      Our team is reviewing your {DOC_TYPES.find(d => d.value === request?.document_type)?.label ?? "document"}.
      This usually takes 1–2 business days.
    </p>
    <div className="bg-amber-50 border border-amber-100 rounded-xl px-4 py-3 inline-flex items-center gap-2">
      <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
      <span className="text-xs text-amber-700 font-medium">Pending review</span>
    </div>
    <p className="text-xs text-gray-400 mt-4">
      Submitted {request?.submitted_at
        ? new Date(request.submitted_at).toLocaleDateString("en-KE", {
            day: "numeric", month: "short", year: "numeric",
          })
        : "-"}
    </p>
  </div>
);

const RejectedScreen = ({ request, onReapply }) => (
  <div className="bg-white border border-gray-100 rounded-2xl p-8 text-center">
    <div className="w-14 h-14 rounded-2xl bg-red-50 flex items-center justify-center mx-auto mb-4 text-2xl">
      ❌
    </div>
    <h2 className="text-lg font-semibold text-gray-900 mb-1">Request rejected</h2>
    <p className="text-sm text-gray-500 mb-4">
      Unfortunately your request was not approved. You may reapply with a different document.
    </p>
    {request?.rejection_reason && (
      <div className="bg-red-50 border border-red-100 rounded-xl px-4 py-3 mb-5 text-left">
        <p className="text-xs text-red-500 font-medium mb-1">Reason</p>
        <p className="text-sm text-red-700">{request.rejection_reason}</p>
      </div>
    )}
    <button
      onClick={onReapply}
      className="px-6 py-2.5 bg-blue-500 hover:bg-blue-600 text-white text-sm rounded-xl transition-colors"
    >
      Reapply now
    </button>
  </div>
);

const SuccessScreen = ({ onGoProfile }) => (
  <div className="bg-white border border-gray-100 rounded-2xl p-8 text-center">
    <div className="w-14 h-14 rounded-2xl bg-lime-50 flex items-center justify-center mx-auto mb-4 text-2xl">
      🎉
    </div>
    <h2 className="text-lg font-semibold text-gray-900 mb-1">Request submitted!</h2>
    <p className="text-sm text-gray-500 mb-5">
      We've received your application. You'll be notified once it's reviewed.
    </p>
    <button
      onClick={onGoProfile}
      className="px-6 py-2.5 bg-gray-900 hover:bg-gray-800 text-white text-sm rounded-xl transition-colors"
    >
      Back to profile
    </button>
  </div>
);

// ── MAIN PAGE ─────────────────────────────────────────────────
const BecomeLandlord = () => {
  const dispatch    = useDispatch();
  const navigate    = useNavigate();
  const fileRef     = useRef(null);

  const isAuthenticated = useSelector((s) => s.auth.isAuthenticated);
  const authReady       = useSelector((s) => s.auth.authReady);
  const profile         = useSelector((s) => s.user.profile);

  const {
    uploading,
    uploadError,
    uploadedDoc,
    submitting,
    submitError,
    submitSuccess,
    latestRequest,
    requestsLoading,
  } = useSelector((s) => s.landlord);

  const [step,     setStep]     = useState(1);      // 1 | 2 | 3
  const [docType,  setDocType]  = useState(null);
  const [file,     setFile]     = useState(null);
  const [reapply,  setReapply]  = useState(false);  // overrides rejected screen

  // ── Auth guard ──
  useEffect(() => {
    if (!authReady) return;
    if (!isAuthenticated) {
      navigate("/login", { state: { from: { pathname: "/become-landlord" } }, replace: true });
    }
  }, [authReady, isAuthenticated, navigate]);

  // ── Fetch existing requests ──
  useEffect(() => {
    if (isAuthenticated) dispatch(fetchMyLandlordRequests());
  }, [dispatch, isAuthenticated]);

  // ── Reset form state on mount ──
  useEffect(() => {
    dispatch(resetLandlordForm());
    return () => dispatch(resetLandlordForm());
  }, [dispatch]);

  if (!authReady || !isAuthenticated) return null;

  // ── If user is already a landlord/admin, redirect ──
  if (profile?.role === "LANDLORD" || profile?.role === "ADMIN") {
    return (
      <div className="min-h-screen bg-gray-50 pt-24 px-4 pb-16 flex items-center justify-center">
        <div className="bg-white border border-gray-100 rounded-2xl p-8 text-center max-w-sm w-full">
          <div className="text-3xl mb-3">✅</div>
          <h2 className="text-lg font-semibold text-gray-900 mb-1">You're already a landlord</h2>
          <p className="text-sm text-gray-500 mb-5">No need to apply again.</p>
          <button
            onClick={() => navigate("/profile")}
            className="px-6 py-2.5 bg-blue-500 hover:bg-blue-600 text-white text-sm rounded-xl transition-colors"
          >
            Go to profile
          </button>
        </div>
      </div>
    );
  }

  const hasPending  = latestRequest?.status === "PENDING";
  const hasRejected = latestRequest?.status === "REJECTED";
  const showForm    = !hasPending && (!hasRejected || reapply) && !submitSuccess;

  // ── File selection ──
  const handleFileChange = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setFile(f);
    dispatch(clearUpload());
  };

  // ── Upload ──
  const handleUpload = () => {
    if (file) dispatch(uploadLandlordDocument(file));
  };

  // ── Submit ──
  const handleSubmit = () => {
    if (!uploadedDoc || !docType) return;
    dispatch(submitLandlordRequest({
      document_type:      docType,
      document_url:       uploadedDoc.url,
      document_public_id: uploadedDoc.public_id,
    }));
  };

  // ── Step navigation ──
  const canGoNext = () => {
    if (step === 1) return !!docType;
    if (step === 2) return !!uploadedDoc;
    return false;
  };

  return (
    <>
      <div className="min-h-screen bg-gray-50 pt-24 px-4 pb-16">
        <div className="max-w-xl mx-auto">

          {/* Header */}
          <div className="mb-6">
            <button
              onClick={() => navigate("/profile")}
              className="text-xs text-gray-400 hover:text-gray-600 mb-3 flex items-center gap-1 transition-colors"
            >
              ← Back to profile
            </button>
            <h1 className="text-2xl font-semibold text-gray-900">Become a Landlord</h1>
            <p className="text-sm text-gray-500 mt-1">
              Submit a document to verify your property ownership or management rights.
            </p>
          </div>

          {/* Status screens */}
          {requestsLoading && (
            <div className="bg-white border border-gray-100 rounded-2xl p-8 text-center">
              <div className="w-8 h-8 border-2 border-blue-200 border-t-blue-500 rounded-full animate-spin mx-auto" />
            </div>
          )}

          {!requestsLoading && submitSuccess && (
            <SuccessScreen onGoProfile={() => navigate("/profile")} />
          )}

          {!requestsLoading && !submitSuccess && hasPending && (
            <PendingScreen request={latestRequest} />
          )}

          {!requestsLoading && !submitSuccess && hasRejected && !reapply && (
            <RejectedScreen
              request={latestRequest}
              onReapply={() => { setReapply(true); setStep(1); dispatch(resetLandlordForm()); }}
            />
          )}

          {/* Main form */}
          {!requestsLoading && showForm && (
            <>
              <Steps current={step} />

              {/* ── STEP 1: Choose document type ── */}
              {step === 1 && (
                <div className="space-y-3">
                  <p className="text-xs text-gray-400 uppercase tracking-wide mb-4">
                    What document are you submitting?
                  </p>
                  {DOC_TYPES.map((doc) => (
                    <button
                      key={doc.value}
                      onClick={() => setDocType(doc.value)}
                      className={`w-full flex items-start gap-4 p-4 rounded-2xl border text-left transition-all
                        ${docType === doc.value
                          ? "border-blue-400 bg-blue-50 ring-1 ring-blue-300"
                          : "border-gray-100 bg-white hover:border-gray-200 hover:bg-gray-50"
                        }`}
                    >
                      <span className="text-2xl mt-0.5">{doc.icon}</span>
                      <div>
                        <p className="text-sm font-semibold text-gray-900">{doc.label}</p>
                        <p className="text-xs text-gray-500 mt-0.5">{doc.desc}</p>
                      </div>
                      {docType === doc.value && (
                        <span className="ml-auto text-blue-500 text-sm">✓</span>
                      )}
                    </button>
                  ))}

                  <div className="flex justify-end pt-2">
                    <button
                      onClick={() => setStep(2)}
                      disabled={!canGoNext()}
                      className="px-6 py-2.5 bg-blue-500 hover:bg-blue-600 text-white text-sm rounded-xl transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      Continue →
                    </button>
                  </div>
                </div>
              )}

              {/* ── STEP 2: Upload file ── */}
              {step === 2 && (
                <div className="bg-white border border-gray-100 rounded-2xl p-6">
                  <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">
                    Upload your document
                  </p>
                  <p className="text-xs text-gray-400 mb-5">
                    Accepted formats: PDF, JPEG, PNG, WebP · Max 10MB
                  </p>

                  {/* Drop zone */}
                  <div
                    onClick={() => !uploading && fileRef.current?.click()}
                    className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-colors
                      ${uploadedDoc
                        ? "border-lime-300 bg-lime-50"
                        : uploading
                        ? "border-blue-200 bg-blue-50 cursor-wait"
                        : "border-gray-200 hover:border-blue-300 hover:bg-gray-50"
                      }`}
                  >
                    {uploading ? (
                      <div className="space-y-2">
                        <div className="w-8 h-8 border-2 border-blue-200 border-t-blue-500 rounded-full animate-spin mx-auto" />
                        <p className="text-xs text-blue-500">Uploading…</p>
                      </div>
                    ) : uploadedDoc ? (
                      <div className="space-y-1">
                        <div className="text-2xl">✅</div>
                        <p className="text-sm font-medium text-lime-700">Upload successful</p>
                        <p className="text-xs text-gray-500 truncate max-w-xs mx-auto">{file?.name}</p>
                        <button
                          onClick={(e) => { e.stopPropagation(); setFile(null); dispatch(clearUpload()); }}
                          className="text-xs text-red-400 hover:text-red-500 mt-1"
                        >
                          Remove & re-upload
                        </button>
                      </div>
                    ) : file ? (
                      <div className="space-y-2">
                        <div className="text-2xl">📄</div>
                        <p className="text-sm font-medium text-gray-700 truncate max-w-xs mx-auto">{file.name}</p>
                        <p className="text-xs text-gray-400">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                        <button
                          onClick={(e) => { e.stopPropagation(); handleUpload(); }}
                          className="mt-2 px-5 py-2 bg-blue-500 hover:bg-blue-600 text-white text-xs rounded-xl transition-colors"
                        >
                          Upload this file
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-1">
                        <div className="text-3xl">📁</div>
                        <p className="text-sm font-medium text-gray-600">Click to choose a file</p>
                        <p className="text-xs text-gray-400">PDF, JPEG, PNG or WebP</p>
                      </div>
                    )}
                  </div>

                  <input
                    ref={fileRef}
                    type="file"
                    accept=".pdf,image/jpeg,image/png,image/webp"
                    className="hidden"
                    onChange={handleFileChange}
                  />

                  {uploadError && (
                    <div className="mt-3 bg-red-50 border border-red-100 text-red-500 text-xs px-4 py-2 rounded-xl">
                      {uploadError}
                    </div>
                  )}

                  <div className="flex justify-between mt-5">
                    <button
                      onClick={() => setStep(1)}
                      className="text-xs px-4 py-2 rounded-xl border border-gray-200 text-gray-500 hover:bg-gray-50 transition-colors"
                    >
                      ← Back
                    </button>
                    <button
                      onClick={() => setStep(3)}
                      disabled={!canGoNext()}
                      className="px-6 py-2.5 bg-blue-500 hover:bg-blue-600 text-white text-sm rounded-xl transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      Continue →
                    </button>
                  </div>
                </div>
              )}

              {/* ── STEP 3: Review & submit ── */}
              {step === 3 && (
                <div className="bg-white border border-gray-100 rounded-2xl p-6">
                  <p className="text-xs text-gray-400 uppercase tracking-wide mb-5">
                    Review your submission
                  </p>

                  <div className="space-y-3 mb-6">
                    {[
                      {
                        label: "Document type",
                        value: DOC_TYPES.find((d) => d.value === docType)?.label ?? docType,
                      },
                      { label: "File",          value: file?.name ?? "—" },
                      { label: "Size",          value: file ? `${(file.size / 1024 / 1024).toFixed(2)} MB` : "—" },
                      { label: "Submitted as",  value: `${profile?.first_name ?? ""} ${profile?.last_name ?? ""}`.trim() || "—" },
                    ].map(({ label, value }) => (
                      <div key={label} className="flex justify-between items-center py-2 border-b border-gray-50 last:border-0">
                        <span className="text-xs text-gray-400">{label}</span>
                        <span className="text-sm text-gray-700 font-medium truncate max-w-[200px]">{value}</span>
                      </div>
                    ))}
                  </div>

                  <div className="bg-blue-50 border border-blue-100 rounded-xl px-4 py-3 text-xs text-blue-600 mb-5">
                    By submitting, you confirm this document is authentic and belongs to you or your organization.
                  </div>

                  {submitError && (
                    <div className="mb-4 bg-red-50 border border-red-100 text-red-500 text-xs px-4 py-2 rounded-xl">
                      {submitError}
                    </div>
                  )}

                  <div className="flex justify-between">
                    <button
                      onClick={() => setStep(2)}
                      className="text-xs px-4 py-2 rounded-xl border border-gray-200 text-gray-500 hover:bg-gray-50 transition-colors"
                    >
                      ← Back
                    </button>
                    <button
                      onClick={handleSubmit}
                      disabled={submitting}
                      className="px-6 py-2.5 bg-gray-900 hover:bg-gray-800 text-white text-sm rounded-xl transition-colors disabled:opacity-50 flex items-center gap-2"
                    >
                      {submitting && (
                        <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      )}
                      {submitting ? "Submitting…" : "Submit request"}
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
      <Footer />
    </>
  );
};

export default BecomeLandlord;