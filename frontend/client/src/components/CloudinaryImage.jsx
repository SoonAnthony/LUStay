import { useState } from "react";

const getOptimizedUrl = (url, width = 800) => {
  if (!url || !url.includes("cloudinary.com")) return url;
  return url.replace(
    "/upload/",
    `/upload/f_auto,q_auto,w_${width},c_fill/`
  );
};

const getBlurUrl = (url) => {
  if (!url || !url.includes("cloudinary.com")) return url;
  return url.replace(
    "/upload/",
    "/upload/w_20,q_10,e_blur:1000/"
  );
};

const CloudinaryImage = ({
  src,
  alt,
  width = 800,
  className = "",
  style = {},
}) => {
  const [loaded, setLoaded] = useState(false);

  const optimizedSrc = getOptimizedUrl(src, width);
  const blurSrc = getBlurUrl(src);

  return (
    <div style={{ position: "relative", overflow: "hidden", width: "100%", height: "100%", ...style }}>
      {!loaded && (
        <img
          src={blurSrc}
          alt=""
          aria-hidden="true"
          style={{
            position: "absolute",
            inset: 0,
            width: "100%",
            height: "100%",
            objectFit: "cover",
            filter: "blur(10px)",
            transform: "scale(1.05)",
          }}
        />
      )}
      <img
        src={optimizedSrc}
        alt={alt}
        loading="lazy"
        onLoad={() => setLoaded(true)}
        className={className}
        style={{
          width: "100%",
          height: "100%",
          objectFit: "cover",
          opacity: loaded ? 1 : 0,
          transition: "opacity 0.4s ease",
        }}
      />
    </div>
  );
};

export default CloudinaryImage;