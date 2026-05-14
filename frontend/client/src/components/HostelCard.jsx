import { Link } from "react-router-dom";
import {
  HiOutlineLocationMarker,
  HiOutlineShieldCheck,
  HiOutlineTag,
} from "react-icons/hi";
import { MdOutlineApartment } from "react-icons/md";
import CloudinaryImage from "./CloudinaryImage";

const truncate = (text, len) =>
  text?.length > len ? text.substring(0, len) + "..." : text;

const STATUS_STYLES = {
  APPROVED: "bg-green-500",
  PENDING: "bg-yellow-500",
  REJECTED: "bg-red-500",
  SUSPENDED: "bg-gray-500",
};

const HostelCard = ({ hostel }) => {
  const {
    id,
    name,
    location,
    description,
    status,
    images = [],
    amenities = [],
  } = hostel;

  const primaryImage = images.find((img) => img.is_primary) || images[0];
  const coverImage = primaryImage?.image_url || null;
  const statusStyle = STATUS_STYLES[status] || "bg-gray-400";

  return (
    <Link
      to={`/hostels/${id}`}
      className="group block bg-white rounded-2xl overflow-hidden shadow-md hover:shadow-xl transition"
    >
      {/* Image */}
      <div className="relative h-48 overflow-hidden bg-gray-100">
        {coverImage ? (
          <CloudinaryImage
            src={coverImage}
            alt={name}
            width={600}
            className="group-hover:scale-110 transition duration-500"
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center text-gray-300 gap-2">
            <MdOutlineApartment className="text-5xl" />
            <span className="text-xs">No image available</span>
          </div>
        )}

        {/* Status badge */}
        <span
          className={`absolute top-3 left-3 ${statusStyle} text-white text-xs px-2 py-1 rounded flex items-center gap-1`}
        >
          {status === "APPROVED" && <HiOutlineShieldCheck />}
          {status.charAt(0) + status.slice(1).toLowerCase()}
        </span>

        {/* Photo count */}
        {images.length > 1 && (
          <span className="absolute bottom-3 right-3 bg-black/60 text-white text-xs px-2 py-1 rounded">
            +{images.length - 1} photos
          </span>
        )}
      </div>

      {/* Body */}
      <div className="p-4">
        <h3 className="font-semibold text-lg text-gray-800 truncate">{name}</h3>

        <p className="flex items-center text-gray-500 text-sm gap-1 mt-1">
          <HiOutlineLocationMarker className="shrink-0" />
          {location}
        </p>

        <p className="text-gray-400 text-sm mt-2 leading-snug">
          {truncate(description, 90) || "No description provided."}
        </p>

        {/* Amenities */}
        {amenities.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-3">
            {amenities.slice(0, 3).map((amenity) => (
              <span
                key={amenity.id}
                className="flex items-center gap-1 text-xs bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full"
              >
                <HiOutlineTag className="text-[10px]" />
                {amenity.name}
              </span>
            ))}
            {amenities.length > 3 && (
              <span className="text-xs text-gray-400 px-2 py-0.5">
                +{amenities.length - 3} more
              </span>
            )}
          </div>
        )}

        {/* Footer */}
        <div className="flex justify-between items-center mt-3 border-t pt-3">
          <div className="flex items-center gap-1 text-gray-400 text-sm">
            <MdOutlineApartment />
            <span>
              {images.length} image{images.length !== 1 ? "s" : ""}
            </span>
          </div>
          <span className="text-blue-500 text-sm font-medium">View →</span>
        </div>
      </div>
    </Link>
  );
};

export default HostelCard;

export const HostelCardSkeleton = () => (
  <div className="animate-pulse bg-white rounded-2xl overflow-hidden shadow">
    <div className="h-48 bg-gray-300" />
    <div className="p-4 space-y-3">
      <div className="h-4 bg-gray-300 rounded w-3/4" />
      <div className="h-3 bg-gray-300 rounded w-1/2" />
      <div className="h-3 bg-gray-300 rounded w-full" />
      <div className="h-3 bg-gray-300 rounded w-5/6" />
      <div className="flex gap-2 mt-2">
        <div className="h-5 bg-gray-200 rounded-full w-16" />
        <div className="h-5 bg-gray-200 rounded-full w-16" />
      </div>
    </div>
  </div>
);