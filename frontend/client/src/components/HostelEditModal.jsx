import { useState, useEffect, useRef } from "react";
import {
  X, Save, Plus, Trash2, ChevronDown, ChevronUp,
  Loader2, CheckCircle2, AlertCircle, Upload, Star,
  Image as ImageIcon, RefreshCw, Edit2, Check,
} from "lucide-react";
import api from "../api/axios";

// ── ERROR HELPER ─────────────────────────────────────────────
const getErrorMsg = (e, fallback = "Something went wrong") => {
  const detail = e?.response?.data?.detail;
  if (!detail) return fallback;
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail))
    return detail.map((d) => (typeof d === "string" ? d : d.msg || JSON.stringify(d))).join(", ");
  return fallback;
};

// ── TOAST ─────────────────────────────────────────────────────
function Toast({ message, type, onClose }) {
  useEffect(() => {
    const t = setTimeout(onClose, 3500);
    return () => clearTimeout(t);
  }, [onClose]);

  const styles = {
    success: "bg-emerald-50 border-emerald-200 text-emerald-800",
    error:   "bg-red-50 border-red-200 text-red-800",
  };
  const Icon = type === "success" ? CheckCircle2 : AlertCircle;
  const safeMsg = typeof message === "string" ? message : JSON.stringify(message);

  return (
    <div
      className={`fixed bottom-6 right-6 z-[100] flex items-center gap-3 px-4 py-3 rounded-xl border shadow-lg text-sm font-medium animate-slide-up ${styles[type]}`}
    >
      <Icon size={16} />
      {safeMsg}
      <button onClick={onClose} className="ml-2 opacity-60 hover:opacity-100">
        <X size={14} />
      </button>
    </div>
  );
}

// ── SECTION ───────────────────────────────────────────────────
function Section({ title, children, collapsible = false, badge }) {
  const [open, setOpen] = useState(true);
  return (
    <div className="border border-gray-100 rounded-2xl overflow-hidden">
      <button
        type="button"
        onClick={() => collapsible && setOpen((o) => !o)}
        className={`w-full flex items-center justify-between px-5 py-4 bg-gray-50 text-left ${collapsible ? "cursor-pointer" : "cursor-default"}`}
      >
        <div className="flex items-center gap-2">
          <span className="font-semibold text-gray-800 text-sm tracking-wide uppercase">{title}</span>
          {badge !== undefined && (
            <span className="text-xs bg-blue-100 text-blue-600 px-2 py-0.5 rounded-full font-semibold">{badge}</span>
          )}
        </div>
        {collapsible && (
          open
            ? <ChevronUp size={16} className="text-gray-400" />
            : <ChevronDown size={16} className="text-gray-400" />
        )}
      </button>
      {open && <div className="p-5 space-y-4">{children}</div>}
    </div>
  );
}

// ── FIELD ─────────────────────────────────────────────────────
function Field({ label, children, hint }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{label}</label>
      {children}
      {hint && <p className="text-[10px] text-gray-400">{hint}</p>}
    </div>
  );
}

const inputCls =
  "w-full px-3 py-2.5 text-sm rounded-xl border border-gray-200 focus:border-blue-400 focus:ring-2 focus:ring-blue-100 outline-none transition bg-white";

const ROOM_STATUSES = ["AVAILABLE", "PARTIALLY_OCCUPIED", "FULLY_OCCUPIED", "MAINTENANCE"];

const statusColor = {
  AVAILABLE:          "bg-emerald-100 text-emerald-700",
  PARTIALLY_OCCUPIED: "bg-amber-100 text-amber-700",
  FULLY_OCCUPIED:     "bg-orange-100 text-orange-700",
  MAINTENANCE:        "bg-red-100 text-red-700",
};

// ══════════════════════════════════════════════════════════════
// SECTION: HOSTEL IMAGES
// ══════════════════════════════════════════════════════════════
function HostelImagesSection({ hostel, showToast }) {
  const [images,         setImages]         = useState(hostel.images || []);
  const [uploading,      setUploading]      = useState(false);
  const [settingPrimary, setSettingPrimary] = useState(null);
  const [deletingImg,    setDeletingImg]    = useState(null);
  const fileRef = useRef();

  const handleUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (!files.length) return;
    setUploading(true);
    try {
      const formData = new FormData();
      files.forEach((f) => formData.append("files", f));
      const { data } = await api.post(`/hostels/${hostel.id}/images`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      const uploaded = Array.isArray(data) ? data : [data];
      setImages((p) => [...p, ...uploaded]);
      showToast(`${uploaded.length} image${uploaded.length > 1 ? "s" : ""} uploaded!`);
    } catch (e) {
      showToast(getErrorMsg(e, "Upload failed"), "error");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const handleSetPrimary = async (imageId) => {
    setSettingPrimary(imageId);
    try {
      await api.patch(`/hostels/images/${imageId}/primary`);
      setImages((p) => p.map((img) => ({ ...img, is_primary: img.id === imageId })));
      showToast("Primary image updated!");
    } catch (e) {
      showToast(getErrorMsg(e, "Failed"), "error");
    } finally {
      setSettingPrimary(null);
    }
  };

  const handleDeleteImage = async (imageId) => {
    if (!window.confirm("Delete this image?")) return;
    setDeletingImg(imageId);
    try {
      await api.delete(`/hostels/images/${imageId}`);
      setImages((p) => p.filter((img) => img.id !== imageId));
      showToast("Image deleted");
    } catch (e) {
      showToast(getErrorMsg(e, "Failed"), "error");
    } finally {
      setDeletingImg(null);
    }
  };

  return (
    <Section title="Hostel Images" collapsible badge={images.length}>
      <div
        className="border-2 border-dashed border-gray-200 rounded-xl p-4 text-center cursor-pointer hover:border-blue-300 hover:bg-blue-50/30 transition-colors"
        onClick={() => fileRef.current?.click()}
      >
        {uploading ? (
          <div className="flex items-center justify-center gap-2 text-sm text-blue-500">
            <Loader2 size={16} className="animate-spin" />
            Uploading…
          </div>
        ) : (
          <div className="flex flex-col items-center gap-1">
            <Upload size={20} className="text-gray-400" />
            <p className="text-sm text-gray-500 font-medium">Click to upload images</p>
            <p className="text-xs text-gray-400">JPG, PNG, WebP · Multiple files OK</p>
          </div>
        )}
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={handleUpload}
          disabled={uploading}
        />
      </div>

      {images.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {images.map((img) => (
            <div key={img.id} className="relative group rounded-xl overflow-hidden border border-gray-100 aspect-video bg-gray-100">
              <img src={img.image_url} alt="Hostel" className="w-full h-full object-cover" />
              {img.is_primary && (
                <div className="absolute top-1.5 left-1.5 flex items-center gap-1 bg-yellow-400 text-yellow-900 text-[10px] font-bold px-2 py-0.5 rounded-full">
                  <Star size={9} fill="currentColor" />
                  Primary
                </div>
              )}
              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                {!img.is_primary && (
                  <button
                    onClick={() => handleSetPrimary(img.id)}
                    disabled={settingPrimary === img.id}
                    title="Set as primary"
                    className="p-1.5 bg-yellow-400 hover:bg-yellow-500 text-yellow-900 rounded-lg transition disabled:opacity-60"
                  >
                    {settingPrimary === img.id
                      ? <Loader2 size={13} className="animate-spin" />
                      : <Star size={13} />}
                  </button>
                )}
                <button
                  onClick={() => handleDeleteImage(img.id)}
                  disabled={deletingImg === img.id}
                  title="Delete image"
                  className="p-1.5 bg-red-500 hover:bg-red-600 text-white rounded-lg transition disabled:opacity-60"
                >
                  {deletingImg === img.id
                    ? <Loader2 size={13} className="animate-spin" />
                    : <Trash2 size={13} />}
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-gray-400 text-center py-2">No images yet. Upload some above.</p>
      )}
    </Section>
  );
}

// ══════════════════════════════════════════════════════════════
// SECTION: AMENITIES
// ══════════════════════════════════════════════════════════════
function AmenitiesSection({ hostel, showToast }) {
  const [allAmenities,     setAllAmenities]     = useState([]);
  const [hostelAmenityIds, setHostelAmenityIds] = useState(
    (hostel.amenities || []).map((a) => a.id)
  );
  const [amenityToggling, setAmenityToggling] = useState({});
  const [newAmenityName,  setNewAmenityName]  = useState("");
  const [creatingAmenity, setCreatingAmenity] = useState(false);
  const [showNewAmenity,  setShowNewAmenity]  = useState(false);

  useEffect(() => {
    api.get("/amenities/").then(({ data }) => setAllAmenities(data)).catch(() => {});
  }, []);

  const toggleAmenity = async (amenityId) => {
    const has = hostelAmenityIds.includes(amenityId);
    setAmenityToggling((p) => ({ ...p, [amenityId]: true }));
    try {
      if (has) {
        await api.delete(`/amenities/${hostel.id}/${amenityId}`);
        setHostelAmenityIds((p) => p.filter((id) => id !== amenityId));
        showToast("Amenity removed");
      } else {
        await api.post(`/amenities/${hostel.id}/${amenityId}`);
        setHostelAmenityIds((p) => [...p, amenityId]);
        showToast("Amenity added");
      }
    } catch (e) {
      showToast(getErrorMsg(e, "Failed"), "error");
    } finally {
      setAmenityToggling((p) => ({ ...p, [amenityId]: false }));
    }
  };

  const handleCreateAmenity = async () => {
    if (!newAmenityName.trim()) return;
    setCreatingAmenity(true);
    try {
      const { data } = await api.post("/amenities/", { name: newAmenityName.trim() });
      setAllAmenities((p) => [...p, data]);
      await api.post(`/amenities/${hostel.id}/${data.id}`);
      setHostelAmenityIds((p) => [...p, data.id]);
      setNewAmenityName("");
      setShowNewAmenity(false);
      showToast("Amenity created & added!");
    } catch (e) {
      showToast(getErrorMsg(e, "Failed"), "error");
    } finally {
      setCreatingAmenity(false);
    }
  };

  return (
    <Section title="Amenities" collapsible badge={hostelAmenityIds.length}>
      {allAmenities.length === 0 ? (
        <p className="text-sm text-gray-400">No amenities in the system yet.</p>
      ) : (
        <div className="flex flex-wrap gap-2">
          {allAmenities.map((a) => {
            const active  = hostelAmenityIds.includes(a.id);
            const loading = amenityToggling[a.id];
            return (
              <button
                key={a.id}
                type="button"
                disabled={loading}
                onClick={() => toggleAmenity(a.id)}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition flex items-center gap-1.5
                  ${active
                    ? "bg-blue-600 border-blue-600 text-white hover:bg-blue-700"
                    : "bg-white border-gray-200 text-gray-600 hover:border-blue-300 hover:text-blue-600"}
                  ${loading ? "opacity-60 cursor-not-allowed" : ""}`}
              >
                {loading && <Loader2 size={11} className="animate-spin" />}
                {a.name}
                {active && !loading && <X size={11} />}
              </button>
            );
          })}
        </div>
      )}

      {showNewAmenity ? (
        <div className="flex gap-2 mt-2">
          <input
            className={`${inputCls} flex-1`}
            placeholder="Amenity name e.g. Wi-Fi, Parking…"
            value={newAmenityName}
            onChange={(e) => setNewAmenityName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleCreateAmenity()}
            autoFocus
          />
          <button
            onClick={handleCreateAmenity}
            disabled={creatingAmenity || !newAmenityName.trim()}
            className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white text-xs font-semibold rounded-xl hover:bg-blue-700 disabled:opacity-60 transition"
          >
            {creatingAmenity ? <Loader2 size={13} className="animate-spin" /> : <Plus size={13} />}
            Add
          </button>
          <button
            onClick={() => { setShowNewAmenity(false); setNewAmenityName(""); }}
            className="px-3 py-2 text-xs text-gray-500 hover:text-gray-700 rounded-xl transition"
          >
            Cancel
          </button>
        </div>
      ) : (
        <button
          onClick={() => setShowNewAmenity(true)}
          className="flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-700 font-semibold transition mt-1"
        >
          <Plus size={13} /> Create new amenity
        </button>
      )}
    </Section>
  );
}

// ══════════════════════════════════════════════════════════════
// SECTION: ROOM TYPE IMAGES MANAGER
// ══════════════════════════════════════════════════════════════
function RoomTypeImagesManager({ roomType, showToast }) {
  const [images,    setImages]    = useState(roomType.images || []);
  const [uploading, setUploading] = useState(false);
  const [deleting,  setDeleting]  = useState(null);
  const fileRef = useRef();

  const handleUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (!files.length) return;
    setUploading(true);
    try {
      const formData = new FormData();
      files.forEach((f) => formData.append("files", f));
      const { data } = await api.post(
        `/landlord/rooms/room-types/${roomType.id}/images/`,
        formData,
        { headers: { "Content-Type": "multipart/form-data" } }
      );
      setImages((p) => [...p, ...(Array.isArray(data) ? data : [data])]);
      showToast("Images uploaded!");
    } catch (e) {
      showToast(getErrorMsg(e, "Upload failed"), "error");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const handleDelete = async (imageId) => {
    if (!window.confirm("Delete this image?")) return;
    setDeleting(imageId);
    try {
      await api.delete(`/landlord/rooms/room-types/images/${imageId}/`);
      setImages((p) => p.filter((i) => i.id !== imageId));
      showToast("Image deleted");
    } catch (e) {
      showToast(getErrorMsg(e, "Failed"), "error");
    } finally {
      setDeleting(null);
    }
  };

  return (
    <div className="mt-3 pl-3 border-l-2 border-blue-100">
      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2 flex items-center gap-1.5">
        <ImageIcon size={12} /> Images ({images.length})
      </p>
      <div className="flex flex-wrap gap-2 mb-2">
        {images.length === 0 && (
          <p className="text-xs text-gray-400 py-1">No images yet.</p>
        )}
        {images.map((img) => (
          <div
            key={img.id}
            className="relative group w-20 h-20 rounded-lg overflow-hidden border border-gray-100 bg-gray-100 shrink-0"
          >
            <img src={img.image_url} alt="" className="w-full h-full object-cover" />
            <button
              onClick={() => handleDelete(img.id)}
              disabled={deleting === img.id}
              className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white"
            >
              {deleting === img.id
                ? <Loader2 size={14} className="animate-spin" />
                : <Trash2 size={14} />}
            </button>
          </div>
        ))}

        {/* Upload button */}
        <button
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
          className="w-20 h-20 rounded-lg border-2 border-dashed border-gray-200 hover:border-blue-300 hover:bg-blue-50/30 transition flex flex-col items-center justify-center gap-1 text-gray-400 hover:text-blue-400 shrink-0"
        >
          {uploading
            ? <Loader2 size={16} className="animate-spin" />
            : <>
                <Upload size={14} />
                <span className="text-[10px] font-medium">Upload</span>
              </>}
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={handleUpload}
          disabled={uploading}
        />
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// SECTION: ROOM TYPES
// ══════════════════════════════════════════════════════════════
function RoomTypesSection({ hostel, roomTypes, setRoomTypes, showToast }) {
  const [showForm,  setShowForm] = useState(false);
  const [adding,    setAdding]   = useState(false);
  const [newImages, setNewImages] = useState([]);
  const fileRef = useRef();

  const [newForm, setNewForm] = useState({
    name:         "Single",
    capacity:     2,
    price_single: "",
    price_double: "",
    description:  "",
  });

  // Re-fetch room types with images from the dedicated endpoint
  const fetchRoomTypes = async () => {
    try {
      const { data } = await api.get(`/rooms/room-types/?hostel_id=${hostel.id}`);
      setRoomTypes(data);
    } catch {
      // fallback: keep current state
    }
  };

  const handleAdd = async () => {
    if (!newForm.price_single || !newForm.price_double) {
      showToast("Both prices are required", "error");
      return;
    }
    setAdding(true);
    try {
      // 1. Create room type
      const { data } = await api.post("/landlord/rooms/room-types/", {
        ...newForm,
        hostel_id:    hostel.id,
        capacity:     parseInt(newForm.capacity),
        price_single: parseInt(newForm.price_single),
        price_double: parseInt(newForm.price_double),
      });

      // 2. Upload images if any were selected
      if (newImages.length > 0) {
        const formData = new FormData();
        newImages.forEach((f) => formData.append("files", f));
        await api.post(
          `/landlord/rooms/room-types/${data.id}/images/`,
          formData,
          { headers: { "Content-Type": "multipart/form-data" } }
        );
      }

      // 3. Re-fetch full list so images are populated
      await fetchRoomTypes();

      setNewForm({ name: "Single", capacity: 2, price_single: "", price_double: "", description: "" });
      setNewImages([]);
      setShowForm(false);
      showToast("Room type created!");
    } catch (e) {
      showToast(getErrorMsg(e, "Failed"), "error");
    } finally {
      setAdding(false);
    }
  };

  const handleSelectImages = (e) => setNewImages(Array.from(e.target.files));
  const removeImage = (index) => setNewImages((p) => p.filter((_, i) => i !== index));

  return (
    <Section title="Room Types" collapsible badge={roomTypes.length}>

      {/* ── EXISTING ROOM TYPES ── */}
      {roomTypes.length > 0 && (
        <div className="space-y-3">
          {roomTypes.map((rt) => (
            <div key={rt.id} className="border border-gray-100 rounded-xl p-4">
              {/* Header row */}
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-semibold text-gray-800">{rt.name}</p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    KSh {rt.price_single?.toLocaleString()} single
                    {rt.price_double ? ` · ${rt.price_double?.toLocaleString()} double` : ""}
                    {rt.capacity ? ` · Capacity: ${rt.capacity}` : ""}
                  </p>
                  {rt.description && (
                    <p className="text-xs text-gray-400 mt-0.5 italic">{rt.description}</p>
                  )}
                </div>
              </div>

              {/* ✅ Images manager — now always rendered so images are visible & deletable */}
              <RoomTypeImagesManager roomType={rt} showToast={showToast} />
            </div>
          ))}
        </div>
      )}

      {/* ── NEW ROOM TYPE FORM ── */}
      {showForm ? (
        <div className="border border-blue-100 bg-blue-50/50 rounded-xl p-4 space-y-4 mt-2">
          <p className="text-xs font-semibold text-blue-700 uppercase tracking-wide">New Room Type</p>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Type name">
              <select
                className={inputCls}
                value={newForm.name}
                onChange={(e) => setNewForm((p) => ({ ...p, name: e.target.value }))}
              >
                <option>Self</option>
                <option>Single</option>
              </select>
            </Field>
            <Field label="Capacity">
              <input
                type="number"
                min={1}
                className={inputCls}
                value={newForm.capacity}
                onChange={(e) => setNewForm((p) => ({ ...p, capacity: e.target.value }))}
              />
            </Field>
            <Field label="Price single (KSh)">
              <input
                type="number"
                className={inputCls}
                value={newForm.price_single}
                onChange={(e) => setNewForm((p) => ({ ...p, price_single: e.target.value }))}
              />
            </Field>
            <Field label="Price double (KSh)">
              <input
                type="number"
                className={inputCls}
                value={newForm.price_double}
                onChange={(e) => setNewForm((p) => ({ ...p, price_double: e.target.value }))}
              />
            </Field>
          </div>

          <Field label="Description (optional)">
            <input
              className={inputCls}
              value={newForm.description}
              onChange={(e) => setNewForm((p) => ({ ...p, description: e.target.value }))}
            />
          </Field>

          <Field label="Images (optional)">
            <div
              onClick={() => fileRef.current?.click()}
              className="border-2 border-dashed border-gray-200 rounded-xl p-4 text-center cursor-pointer hover:border-blue-300 hover:bg-blue-50/30 transition"
            >
              <div className="flex flex-col items-center gap-1">
                <Upload size={18} className="text-gray-400" />
                <p className="text-xs text-gray-500 font-medium">Click to upload images</p>
              </div>
              <input
                ref={fileRef}
                type="file"
                multiple
                accept="image/*"
                className="hidden"
                onChange={handleSelectImages}
              />
            </div>
            {newImages.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {newImages.map((img, i) => (
                  <div key={i} className="relative w-16 h-16 rounded-lg overflow-hidden border">
                    <img src={URL.createObjectURL(img)} alt="" className="w-full h-full object-cover" />
                    <button
                      onClick={() => removeImage(i)}
                      className="absolute inset-0 bg-black/50 flex items-center justify-center text-white opacity-0 hover:opacity-100 transition-opacity"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </Field>

          <div className="flex gap-2">
            <button
              onClick={handleAdd}
              disabled={adding}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-xs font-semibold rounded-xl hover:bg-blue-700 disabled:opacity-60 transition"
            >
              {adding ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
              Create
            </button>
            <button
              onClick={() => { setShowForm(false); setNewImages([]); }}
              className="px-4 py-2 text-xs text-gray-500 hover:text-gray-700 rounded-xl transition"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700 font-semibold transition mt-1"
        >
          <Plus size={15} /> Add room type
        </button>
      )}
    </Section>
  );
}

// ══════════════════════════════════════════════════════════════
// ROOM ROW
// ══════════════════════════════════════════════════════════════
function RoomRow({ room, roomTypes, onUpdate, onDelete }) {
  const [editing, setEditing] = useState(false);
  const [draft,   setDraft]   = useState({
    room_number:  room.room_number,
    status:       room.status,
    occupants:    room.occupants,
    room_type_id: room.room_type_id,
  });
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    await onUpdate(room.id, { ...draft, occupants: parseInt(draft.occupants) || 0 });
    setSaving(false);
    setEditing(false);
  };

  if (editing) {
    return (
      <div className="border border-gray-200 rounded-xl p-3 space-y-3 bg-white">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <div>
            <label className="text-[10px] font-semibold text-gray-400 uppercase">Room #</label>
            <input
              className="w-full mt-1 px-2.5 py-1.5 text-sm border border-gray-200 rounded-lg focus:border-blue-400 outline-none"
              value={draft.room_number}
              onChange={(e) => setDraft((p) => ({ ...p, room_number: e.target.value }))}
            />
          </div>
          <div>
            <label className="text-[10px] font-semibold text-gray-400 uppercase">Type</label>
            <select
              className="w-full mt-1 px-2.5 py-1.5 text-sm border border-gray-200 rounded-lg focus:border-blue-400 outline-none"
              value={draft.room_type_id}
              onChange={(e) => setDraft((p) => ({ ...p, room_type_id: e.target.value }))}
            >
              {roomTypes.map((rt) => (
                <option key={rt.id} value={rt.id}>{rt.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-[10px] font-semibold text-gray-400 uppercase">Status</label>
            <select
              className="w-full mt-1 px-2.5 py-1.5 text-sm border border-gray-200 rounded-lg focus:border-blue-400 outline-none"
              value={draft.status}
              onChange={(e) => setDraft((p) => ({ ...p, status: e.target.value }))}
            >
              {ROOM_STATUSES.map((s) => <option key={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <label className="text-[10px] font-semibold text-gray-400 uppercase">Occupants</label>
            <input
              type="number"
              min={0}
              className="w-full mt-1 px-2.5 py-1.5 text-sm border border-gray-200 rounded-lg focus:border-blue-400 outline-none"
              value={draft.occupants}
              onChange={(e) => setDraft((p) => ({ ...p, occupants: e.target.value }))}
            />
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={save}
            disabled={saving}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white text-xs font-semibold rounded-lg hover:bg-blue-700 disabled:opacity-60 transition"
          >
            {saving ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />} Save
          </button>
          <button
            onClick={() => setEditing(false)}
            className="px-3 py-1.5 text-xs text-gray-500 hover:text-gray-700 rounded-lg transition"
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-between px-4 py-3 bg-gray-50 rounded-xl hover:bg-gray-100 transition group">
      <div className="flex items-center gap-3 flex-wrap min-w-0">
        <span className="font-mono font-semibold text-gray-800 text-sm">{room.room_number}</span>
        <span className="text-xs text-gray-400">{room.room_type?.name}</span>
        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${statusColor[room.status] || "bg-gray-100 text-gray-500"}`}>
          {room.status?.replace("_", " ")}
        </span>
        <span className="text-xs text-gray-400">{room.occupants} occ.</span>
        {room.room_type?.price_single && (
          <span className="text-xs text-gray-400 hidden sm:inline">
            KSh {room.room_type.price_single.toLocaleString()} / {room.room_type.price_double.toLocaleString()}
          </span>
        )}
      </div>
      <div className="flex items-center gap-1 shrink-0">
        <button
          onClick={() => setEditing(true)}
          className="p-1.5 rounded-lg hover:bg-white text-gray-400 hover:text-blue-600 transition"
          title="Edit room"
        >
          <Edit2 size={13} />
        </button>
        <button
          onClick={() => onDelete(room.id)}
          className="p-1.5 rounded-lg hover:bg-white text-gray-400 hover:text-red-500 transition"
          title="Delete room"
        >
          <Trash2 size={13} />
        </button>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// SECTION: ROOMS
// ══════════════════════════════════════════════════════════════
function RoomsSection({ hostel, roomTypes, showToast }) {
  const [rooms,        setRooms]        = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [showForm,     setShowForm]     = useState(false);
  const [adding,       setAdding]       = useState(false);
  const [filterType,   setFilterType]   = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");

  const [newForm, setNewForm] = useState({
    room_number: "", room_type_id: "", status: "AVAILABLE", occupants: 0,
  });

  const fetchRooms = async () => {
    setLoading(true);
    try {
      const { data } = await api.get(`/rooms/?hostel_id=${hostel.id}`);
      setRooms(data);
    } catch { /* silent */ }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchRooms(); }, []);

  useEffect(() => {
    if (roomTypes.length > 0 && !newForm.room_type_id) {
      setNewForm((p) => ({ ...p, room_type_id: String(roomTypes[0].id) }));
    }
  }, [roomTypes]);

  const handleAdd = async () => {
    if (!newForm.room_number || !newForm.room_type_id) {
      showToast("Room number and type are required", "error");
      return;
    }
    setAdding(true);
    try {
      const { data } = await api.post("/landlord/rooms/", {
        hostel_id:    hostel.id,
        room_type_id: String(newForm.room_type_id),
        room_number:  newForm.room_number,
        status:       newForm.status,
        occupants:    parseInt(newForm.occupants) || 0,
      });
      setRooms((p) => [...p, data]);
      setNewForm((p) => ({ ...p, room_number: "", status: "AVAILABLE", occupants: 0 }));
      setShowForm(false);
      showToast("Room added!");
    } catch (e) {
      showToast(getErrorMsg(e, "Failed"), "error");
    } finally {
      setAdding(false);
    }
  };

  const handleUpdate = async (roomId, updates) => {
    try {
      const { data } = await api.patch(`/landlord/rooms/${roomId}/`, updates);
      setRooms((p) => p.map((r) => r.id === roomId ? data : r));
      showToast("Room updated!");
    } catch (e) {
      showToast(getErrorMsg(e, "Failed"), "error");
    }
  };

  const handleDelete = async (roomId) => {
    if (!window.confirm("Delete this room?")) return;
    try {
      await api.delete(`/landlord/rooms/${roomId}/`);
      setRooms((p) => p.filter((r) => r.id !== roomId));
      showToast("Room deleted");
    } catch (e) {
      showToast(getErrorMsg(e, "Failed"), "error");
    }
  };

  const filtered = rooms.filter((r) => {
    const typeOk   = filterType   === "all" || r.room_type?.id === filterType;
    const statusOk = filterStatus === "all" || r.status === filterStatus;
    return typeOk && statusOk;
  });

  const available   = rooms.filter((r) => r.status === "AVAILABLE").length;
  const occupied    = rooms.filter((r) => r.status === "FULLY_OCCUPIED").length;
  const partial     = rooms.filter((r) => r.status === "PARTIALLY_OCCUPIED").length;
  const maintenance = rooms.filter((r) => r.status === "MAINTENANCE").length;

  return (
    <Section title="Rooms" collapsible badge={rooms.length}>
      {rooms.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {[
            { label: "Available",   count: available,   color: "bg-emerald-100 text-emerald-700" },
            { label: "Partial",     count: partial,     color: "bg-amber-100 text-amber-700" },
            { label: "Full",        count: occupied,    color: "bg-orange-100 text-orange-700" },
            { label: "Maintenance", count: maintenance, color: "bg-red-100 text-red-700" },
          ].map(({ label, count, color }) => (
            <span key={label} className={`text-xs px-2.5 py-1 rounded-full font-semibold ${color}`}>
              {count} {label}
            </span>
          ))}
          <button
            onClick={fetchRooms}
            className="text-xs px-2.5 py-1 rounded-full border border-gray-200 text-gray-400 hover:text-blue-500 hover:border-blue-200 transition flex items-center gap-1"
          >
            <RefreshCw size={10} /> Refresh
          </button>
        </div>
      )}

      {rooms.length > 0 && (
        <div className="flex flex-wrap gap-2">
          <select
            className="text-xs px-3 py-1.5 border border-gray-200 rounded-lg outline-none focus:border-blue-400 bg-white"
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
          >
            <option value="all">All types</option>
            {roomTypes.map((rt) => (
              <option key={rt.id} value={rt.id}>{rt.name}</option>
            ))}
          </select>
          <select
            className="text-xs px-3 py-1.5 border border-gray-200 rounded-lg outline-none focus:border-blue-400 bg-white"
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
          >
            <option value="all">All statuses</option>
            {ROOM_STATUSES.map((s) => (
              <option key={s} value={s}>{s.replace("_", " ")}</option>
            ))}
          </select>
        </div>
      )}

      {loading ? (
        <div className="flex items-center gap-2 text-sm text-gray-400 py-2">
          <Loader2 size={15} className="animate-spin" /> Loading rooms…
        </div>
      ) : filtered.length === 0 ? (
        <p className="text-sm text-gray-400 py-2">
          {rooms.length === 0 ? "No rooms yet. Add one below." : "No rooms match the current filters."}
        </p>
      ) : (
        <div className="space-y-2">
          {filtered.map((room) => (
            <RoomRow
              key={room.id}
              room={room}
              roomTypes={roomTypes}
              onUpdate={handleUpdate}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}

      {showForm ? (
        <div className="border border-emerald-100 bg-emerald-50/50 rounded-xl p-4 space-y-3 mt-2">
          <p className="text-xs font-semibold text-emerald-700 uppercase tracking-wide">New Room</p>
          {roomTypes.length === 0 ? (
            <p className="text-xs text-amber-600 bg-amber-50 px-3 py-2 rounded-lg border border-amber-100">
              ⚠ Create a room type first before adding rooms.
            </p>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Room number">
                  <input
                    className={inputCls}
                    value={newForm.room_number}
                    onChange={(e) => setNewForm((p) => ({ ...p, room_number: e.target.value }))}
                    placeholder="e.g. A-101"
                  />
                </Field>
                <Field label="Room type">
                  <select
                    className={inputCls}
                    value={newForm.room_type_id}
                    onChange={(e) => setNewForm((p) => ({ ...p, room_type_id: String(e.target.value) }))}
                  >
                    <option value="">— select —</option>
                    {roomTypes.map((rt) => (
                      <option key={rt.id} value={String(rt.id)}>
                        {rt.name} · KSh {rt.price_single?.toLocaleString()}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Status">
                  <select
                    className={inputCls}
                    value={newForm.status}
                    onChange={(e) => setNewForm((p) => ({ ...p, status: e.target.value }))}
                  >
                    {ROOM_STATUSES.map((s) => <option key={s}>{s}</option>)}
                  </select>
                </Field>
                <Field label="Current occupants">
                  <input
                    type="number"
                    min={0}
                    className={inputCls}
                    value={newForm.occupants}
                    onChange={(e) => setNewForm((p) => ({ ...p, occupants: e.target.value }))}
                  />
                </Field>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleAdd}
                  disabled={adding}
                  className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white text-xs font-semibold rounded-xl hover:bg-emerald-700 disabled:opacity-60 transition"
                >
                  {adding ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />} Add Room
                </button>
                <button
                  onClick={() => setShowForm(false)}
                  className="px-4 py-2 text-xs text-gray-500 hover:text-gray-700 rounded-xl transition"
                >
                  Cancel
                </button>
              </div>
            </>
          )}
        </div>
      ) : (
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 text-sm text-emerald-600 hover:text-emerald-700 font-semibold transition mt-2"
        >
          <Plus size={15} /> Add room
        </button>
      )}
    </Section>
  );
}

// ══════════════════════════════════════════════════════════════
// MAIN MODAL
// ══════════════════════════════════════════════════════════════
export default function HostelEditModal({ hostel, onClose, onSaved }) {
  const [form, setForm] = useState({
    name:        hostel.name        || "",
    description: hostel.description || "",
    location:    hostel.location    || "",
    latitude:    hostel.latitude    ?? "",
    longitude:   hostel.longitude   ?? "",
  });
  const [savingHostel, setSavingHostel] = useState(false);
  const [toast,        setToast]        = useState(null);
  const [roomTypes,    setRoomTypes]    = useState([]);

  // ✅ Fetch room types directly so images are always included
  useEffect(() => {
    api.get(`/rooms/room-types/?hostel_id=${hostel.id}`)
      .then(({ data }) => setRoomTypes(data))
      .catch(() => {
        // Fallback: derive from rooms (no images, but at least types are shown)
        api.get(`/rooms/?hostel_id=${hostel.id}`)
          .then(({ data }) => {
            const seen = new Map();
            data.forEach((r) => {
              if (r.room_type && !seen.has(r.room_type.id))
                seen.set(r.room_type.id, r.room_type);
            });
            setRoomTypes([...seen.values()]);
          })
          .catch(() => {});
      });
  }, [hostel.id]);

  const showToast = (message, type = "success") =>
    setToast({ message: String(message), type });

  const handleSaveHostel = async () => {
    setSavingHostel(true);
    try {
      await api.patch(`/hostels/${hostel.id}`, {
        ...form,
        latitude:  form.latitude  !== "" ? parseFloat(form.latitude)  : null,
        longitude: form.longitude !== "" ? parseFloat(form.longitude) : null,
      });
      showToast("Hostel details saved!");
      onSaved?.();
    } catch (e) {
      showToast(getErrorMsg(e, "Update failed"), "error");
    } finally {
      setSavingHostel(false);
    }
  };

  return (
    <>
      <style>{`
        @keyframes slide-up {
          from { opacity: 0; transform: translateY(12px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .animate-slide-up { animation: slide-up .25s ease both; }
        @keyframes modal-in {
          from { opacity: 0; transform: scale(.97); }
          to   { opacity: 1; transform: scale(1); }
        }
        .animate-modal-in { animation: modal-in .2s ease both; }
      `}</style>

      <div
        className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4"
        onClick={(e) => e.target === e.currentTarget && onClose()}
      >
        <div className="animate-modal-in bg-white rounded-3xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden">

          {/* Header */}
          <div className="flex items-center justify-between px-7 py-5 border-b border-gray-100 shrink-0">
            <div>
              <h2 className="text-xl font-bold text-gray-900">Manage Hostel</h2>
              <p className="text-sm text-gray-400 mt-0.5">{hostel.name}</p>
            </div>
            <button
              onClick={onClose}
              className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-gray-100 transition text-gray-500"
            >
              <X size={20} />
            </button>
          </div>

          {/* Scrollable body */}
          <div className="flex-1 overflow-y-auto px-7 py-6 space-y-5">

            {/* ── 1. HOSTEL DETAILS ── */}
            <Section title="Hostel Details">
              <Field label="Name">
                <input className={inputCls} value={form.name}
                  onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} />
              </Field>
              <Field label="Description">
                <textarea className={`${inputCls} resize-none`} rows={3} value={form.description}
                  onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))} />
              </Field>
              <Field label="Location">
                <input className={inputCls} value={form.location}
                  onChange={(e) => setForm((p) => ({ ...p, location: e.target.value }))} />
              </Field>
              <div className="grid grid-cols-2 gap-4">
                <Field label="Latitude" hint="e.g. -1.2921 for Nairobi">
                  <input type="number" step="any" className={inputCls} value={form.latitude}
                    onChange={(e) => setForm((p) => ({ ...p, latitude: e.target.value }))} />
                </Field>
                <Field label="Longitude" hint="e.g. 36.8219 for Nairobi">
                  <input type="number" step="any" className={inputCls} value={form.longitude}
                    onChange={(e) => setForm((p) => ({ ...p, longitude: e.target.value }))} />
                </Field>
              </div>
              <button
                onClick={handleSaveHostel}
                disabled={savingHostel}
                className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white text-sm font-semibold rounded-xl transition"
              >
                {savingHostel ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
                Save Details
              </button>
            </Section>

            {/* ── 2. HOSTEL IMAGES ── */}
            <HostelImagesSection hostel={hostel} showToast={showToast} />

            {/* ── 3. AMENITIES ── */}
            <AmenitiesSection hostel={hostel} showToast={showToast} />

            {/* ── 4. ROOM TYPES ── */}
            <RoomTypesSection
              hostel={hostel}
              roomTypes={roomTypes}
              setRoomTypes={setRoomTypes}
              showToast={showToast}
            />

            {/* ── 5. ROOMS ── */}
            <RoomsSection
              hostel={hostel}
              roomTypes={roomTypes}
              showToast={showToast}
            />

          </div>
        </div>
      </div>

      {toast && <Toast {...toast} onClose={() => setToast(null)} />}
    </>
  );
}