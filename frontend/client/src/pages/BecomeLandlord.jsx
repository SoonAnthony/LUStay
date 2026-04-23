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

// ── DOCUMENT CONFIG ───────────────────────────────────────────
const DOC_TYPES = [
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

// ── STEP INDICATOR ────────────────────────────────────────────
const Steps = ({ current }) => {
  const steps = ["Upload documents", "Review & submit"];
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
const PendingScreen = () => (
  <div className="bg-white border border-gray-100 rounded-2xl p-8 text-center">
    <div className="w-14 h-14 rounded-2xl bg-amber-50 flex items-center justify-center mx-auto mb-4 text-2xl">⏳</div>
    <h2 className="text-lg font-semibold text-gray-900 mb-1">Request under review</h2>
    <p className="text-sm text-gray-500 mb-5">Our team is reviewing your documents. This usually takes 1–2 business days.</p>
    <div className="bg-amber-50 border border-amber-100 rounded-xl px-4 py-3 inline-flex items-center gap-2">
      <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
      <span className="text-xs text-amber-700 font-medium">Pending review</span>
    </div>
  </div>
);

const RejectedScreen = ({ request, onReapply }) => (
  <div className="bg-white border border-gray-100 rounded-2xl p-8 text-center">
    <div className="w-14 h-14 rounded-2xl bg-red-50 flex items-center justify-center mx-auto mb-4 text-2xl">❌</div>
    <h2 className="text-lg font-semibold text-gray-900 mb-1">Request rejected</h2>
    <p className="text-sm text-gray-500 mb-4">You may reapply with updated documents.</p>
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
    <div className="w-14 h-14 rounded-2xl bg-lime-50 flex items-center justify-center mx-auto mb-4 text-2xl">🎉</div>
    <h2 className="text-lg font-semibold text-gray-900 mb-1">Request submitted!</h2>
    <p className="text-sm text-gray-500 mb-5">We've received your application. You'll be notified once it's reviewed.</p>
    <button
      onClick={onGoProfile}
      className="px-6 py-2.5 bg-gray-900 hover:bg-gray-800 text-white text-sm rounded-xl transition-colors"
    >
      Back to profile
    </button>
  </div>
);

// ── SINGLE DOC UPLOAD CARD ────────────────────────────────────
const DocUploadCard = ({ doc, uploadedDoc, uploading, uploadError, onFileChange, onUpload, onRemove, fileRef }) => {
  const isDone = !!uploadedDoc;

  return (
    <div className={`bg-white border rounded-2xl p-5 transition-all ${isDone ? "border-lime-200" : "border-gray-100"}`}>
      <div className="flex items-center gap-3 mb-4">
        <span className="text-xl">{doc.icon}</span>
        <div className="flex-1">
          <p className="text-sm font-semibold text-gray-900">{doc.label}</p>
          <p className="text-xs text-gray-400 mt-0.5">{doc.desc}</p>
        </div>
        {isDone && <span className="text-lime-500 text-sm font-semibold">✓ Done</span>}
      </div>

      {isDone ? (
        <div className="flex items-center justify-between bg-lime-50 rounded-xl px-4 py-2">
          <span className="text-xs text-lime-700 font-medium truncate max-w-50">{uploadedDoc.fileName}</span>
          <button
            onClick={onRemove}
            className="text-xs text-red-400 hover:text-red-500 ml-3 shrink-0"
          >
            Remove
          </button>
        </div>
      ) : (
        <div
          onClick={() => !uploading && fileRef.current?.click()}
          className={`border-2 border-dashed rounded-xl p-4 text-center cursor-pointer transition-colors
            ${uploading
              ? "border-blue-200 bg-blue-50 cursor-wait"
              : "border-gray-200 hover:border-blue-300 hover:bg-gray-50"
            }`}
        >
          {uploading ? (
            <div className="flex items-center justify-center gap-2">
              <div className="w-4 h-4 border-2 border-blue-200 border-t-blue-500 rounded-full animate-spin" />
              <span className="text-xs text-blue-500">Uploading…</span>
            </div>
          ) : (
            <div>
              <p className="text-xs font-medium text-gray-600">Click to upload</p>
              <p className="text-xs text-gray-400 mt-0.5">PDF, JPEG, PNG or WebP · Max 10MB</p>
            </div>
          )}
        </div>
      )}

      {/* Hidden file input — triggers upload immediately on file select */}
      <input
        ref={fileRef}
        type="file"
        accept=".pdf,image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={onFileChange}
      />

      {uploadError && (
        <div className="mt-2 bg-red-50 border border-red-100 text-red-500 text-xs px-3 py-2 rounded-xl">
          {uploadError}
        </div>
      )}
    </div>
  );
};

// ── MAIN PAGE ─────────────────────────────────────────────────
const BecomeLandlord = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const isAuthenticated = useSelector((s) => s.auth.isAuthenticated);
  const authReady       = useSelector((s) => s.auth.authReady);
  const profile         = useSelector((s) => s.user.profile);
  const { submitting, submitError, submitSuccess, latestRequest, requestsLoading } =
    useSelector((s) => s.landlord);

  const [step,    setStep]    = useState(1);
  const [reapply, setReapply] = useState(false);

  // Per-document state: { file, uploading, uploaded: { url, public_id, fileName } | null, error }
  const initDocState = () => ({ file: null, uploading: false, uploaded: null, error: null });
  const [docs, setDocs] = useState({
    title_deed:           initDocState(),
    lease_agreement:      initDocState(),
    authorization_letter: initDocState(),
  });

  // One ref per document
  const fileRefs = {
    title_deed:           useRef(null),
    lease_agreement:      useRef(null),
    authorization_letter: useRef(null),
  };

  // ── Auth guard ──
  useEffect(() => {
    if (!authReady) return;
    if (!isAuthenticated) {
      navigate("/login", { state: { from: { pathname: "/become-landlord" } }, replace: true });
    }
  }, [authReady, isAuthenticated, navigate]);

  useEffect(() => {
    if (isAuthenticated) dispatch(fetchMyLandlordRequests());
  }, [dispatch, isAuthenticated]);

  useEffect(() => {
    dispatch(resetLandlordForm());
    return () => dispatch(resetLandlordForm());
  }, [dispatch]);

  if (!authReady || !isAuthenticated) return null;

  if (profile?.role === "LANDLORD" || profile?.role === "ADMIN") {
    return (
      <div className="min-h-screen bg-gray-50 pt-24 px-4 pb-16 flex items-center justify-center">
        <div className="bg-white border border-gray-100 rounded-2xl p-8 text-center max-w-sm w-full">
          <div className="text-3xl mb-3">✅</div>
          <h2 className="text-lg font-semibold text-gray-900 mb-1">You're already a landlord</h2>
          <p className="text-sm text-gray-500 mb-5">No need to apply again.</p>
          <button onClick={() => navigate("/profile")} className="px-6 py-2.5 bg-blue-500 hover:bg-blue-600 text-white text-sm rounded-xl transition-colors">
            Go to profile
          </button>
        </div>
      </div>
    );
  }

  const hasPending  = latestRequest?.status === "PENDING";
  const hasRejected = latestRequest?.status === "REJECTED";
  const showForm    = !hasPending && (!hasRejected || reapply) && !submitSuccess;

  const allUploaded = DOC_TYPES.every((d) => !!docs[d.key].uploaded);

  // ── Per-doc handlers ──
  const handleFileChange = async (key, e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Reset file input so same file can be re-selected after removal
    e.target.value = "";

    setDocs((prev) => ({
      ...prev,
      [key]: { file, uploading: true, uploaded: null, error: null },
    }));

    try {
      const result = await dispatch(uploadLandlordDocument(file)).unwrap();
      setDocs((prev) => ({
        ...prev,
        [key]: {
          file,
          uploading: false,
          uploaded: { url: result.url, public_id: result.public_id, fileName: file.name },
          error: null,
        },
      }));
    } catch (err) {
      setDocs((prev) => ({
        ...prev,
        [key]: { file: null, uploading: false, uploaded: null, error: err },
      }));
    }
  };

  const handleRemove = (key) => {
    setDocs((prev) => ({ ...prev, [key]: initDocState() }));
  };

  // ── Submit ──
  const handleSubmit = () => {
    if (!allUploaded) return;
    dispatch(submitLandlordRequest({
      title_deed_url:                docs.title_deed.uploaded.url,
      title_deed_public_id:          docs.title_deed.uploaded.public_id,
      lease_agreement_url:           docs.lease_agreement.uploaded.url,
      lease_agreement_public_id:     docs.lease_agreement.uploaded.public_id,
      authorization_letter_url:      docs.authorization_letter.uploaded.url,
      authorization_letter_public_id: docs.authorization_letter.uploaded.public_id,
    }));
  };

  return (
    <>
      <div className="min-h-screen bg-gray-50 pt-24 px-4 pb-16">
        <div className="max-w-xl mx-auto">

          <div className="mb-6">
            <button
              onClick={() => navigate("/profile")}
              className="text-xs text-gray-400 hover:text-gray-600 mb-3 flex items-center gap-1 transition-colors"
            >
              ← Back to profile
            </button>
            <h1 className="text-2xl font-semibold text-gray-900">Become a Landlord</h1>
            <p className="text-sm text-gray-500 mt-1">
              Upload all three documents to verify your property ownership or management rights.
            </p>
          </div>

          {requestsLoading && (
            <div className="bg-white border border-gray-100 rounded-2xl p-8 text-center">
              <div className="w-8 h-8 border-2 border-blue-200 border-t-blue-500 rounded-full animate-spin mx-auto" />
            </div>
          )}

          {!requestsLoading && submitSuccess && (
            <SuccessScreen onGoProfile={() => navigate("/profile")} />
          )}

          {!requestsLoading && !submitSuccess && hasPending && (
            <PendingScreen />
          )}

          {!requestsLoading && !submitSuccess && hasRejected && !reapply && (
            <RejectedScreen
              request={latestRequest}
              onReapply={() => {
                setReapply(true);
                setStep(1);
                setDocs({ title_deed: initDocState(), lease_agreement: initDocState(), authorization_letter: initDocState() });
                dispatch(resetLandlordForm());
              }}
            />
          )}

          {!requestsLoading && showForm && (
            <>
              <Steps current={step} />

              {/* ── STEP 1: Upload all 3 docs ── */}
              {step === 1 && (
                <div className="space-y-4">
                  {DOC_TYPES.map((doc) => (
                    <DocUploadCard
                      key={doc.key}
                      doc={doc}
                      uploadedDoc={docs[doc.key].uploaded}
                      uploading={docs[doc.key].uploading}
                      uploadError={docs[doc.key].error}
                      fileRef={fileRefs[doc.key]}
                      onFileChange={(e) => handleFileChange(doc.key, e)}
                      onRemove={() => handleRemove(doc.key)}
                    />
                  ))}

                  {!allUploaded && (
                    <p className="text-xs text-gray-400 text-center">
                      All 3 documents are required to continue
                    </p>
                  )}

                  <div className="flex justify-end pt-2">
                    <button
                      onClick={() => setStep(2)}
                      disabled={!allUploaded}
                      className="px-6 py-2.5 bg-blue-500 hover:bg-blue-600 text-white text-sm rounded-xl transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      Continue →
                    </button>
                  </div>
                </div>
              )}

              {/* ── STEP 2: Review & submit ── */}
              {step === 2 && (
                <div className="bg-white border border-gray-100 rounded-2xl p-6">
                  <p className="text-xs text-gray-400 uppercase tracking-wide mb-5">
                    Review your submission
                  </p>

                  <div className="space-y-3 mb-6">
                    {DOC_TYPES.map((doc) => (
                      <div key={doc.key} className="flex justify-between items-center py-2 border-b border-gray-50 last:border-0">
                        <span className="text-xs text-gray-400">{doc.label}</span>
                        <span className="text-sm text-gray-700 font-medium truncate max-w-50">
                          {docs[doc.key].uploaded?.fileName ?? "—"}
                        </span>
                      </div>
                    ))}
                    <div className="flex justify-between items-center py-2">
                      <span className="text-xs text-gray-400">Submitted as</span>
                      <span className="text-sm text-gray-700 font-medium">
                        {`${profile?.first_name ?? ""} ${profile?.last_name ?? ""}`.trim() || "—"}
                      </span>
                    </div>
                  </div>

                  <div className="bg-blue-50 border border-blue-100 rounded-xl px-4 py-3 text-xs text-blue-600 mb-5">
                    By submitting, you confirm these documents are authentic and belong to you or your organization.
                  </div>

                  {submitError && (
                    <div className="mb-4 bg-red-50 border border-red-100 text-red-500 text-xs px-4 py-2 rounded-xl">
                      {submitError}
                    </div>
                  )}

                  <div className="flex justify-between">
                    <button
                      onClick={() => setStep(1)}
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