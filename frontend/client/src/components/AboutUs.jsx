import { Link } from "react-router-dom";
import { useEffect, useRef, useState } from "react";
import { ShieldCheck, Users, Building2, BarChart3, Heart } from "lucide-react";

const statsData = [
  { end: 500, suffix: "+", label: "Students Served" },
  { end: 80,  suffix: "+", label: "Verified Hostels" },
  { end: 12,  suffix: "+", label: "Areas Covered"   },
  { end: 100, suffix: "%", label: "Secure Payments"  },
];

const pillars = [
  {
    icon: ShieldCheck, color: "green",
    title: "Trust & Safety",
    desc: "Only verified and approved listings reach students. No fraud, no guesswork - every hostel is reviewed before it goes live.",
  },
  {
    icon: Building2, color: "blue",
    title: "Hostel Owners",
    desc: "Owners can showcase properties, manage room availability, and connect with a wider student audience in one organized space.",
  },
  {
    icon: Users, color: "cyan",
    title: "Students First",
    desc: "Designed around real student challenges - limited housing, scattered info, and tight budgets - LUStay puts solutions at your fingertips.",
  },
  {
    icon: BarChart3, color: "lime",
    title: "Transparency",
    desc: "Structured records and secure data tracking keep all hostel information consistent, traceable, and reliable across the platform.",
  },
];

const colorMap = {
  green: { bg: "bg-green-100", text: "text-green-600", hoverBg: "group-hover:bg-green-200", hoverText: "group-hover:text-green-600" },
  blue:  { bg: "bg-blue-100",  text: "text-blue-600",  hoverBg: "group-hover:bg-blue-200",  hoverText: "group-hover:text-blue-600"  },
  cyan:  { bg: "bg-cyan-100",  text: "text-cyan-600",  hoverBg: "group-hover:bg-cyan-200",  hoverText: "group-hover:text-cyan-600"  },
  lime:  { bg: "bg-lime-100",  text: "text-lime-600",  hoverBg: "group-hover:bg-lime-200",  hoverText: "group-hover:text-lime-600"  },
};

const areas = [
  "Ndoro","Cherika","Nyumba Tatu","Two Brothers","Comrades",
  "Tairi Mbili","Karuga","Governor","Losogwa",
  "Mambo Leo","Chemichemi","Nyahururu Town",
];

function useInView(threshold = 0.2) {
  const ref = useRef(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setInView(true); obs.disconnect(); } },
      { threshold }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [threshold]);
  return [ref, inView];
}

function Counter({ end, suffix, active }) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    if (!active) return;
    let frame;
    const duration = 1800;
    const startTime = performance.now();
    const tick = (now) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      setCount(Math.floor(eased * end));
      if (progress < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [active, end]);
  return <span>{count}{suffix}</span>;
}


const AboutUs = () => {
  const [statsRef,   statsInView]   = useInView();
  const [missionRef, missionInView] = useInView();
  const [pillarsRef, pillarsInView] = useInView();
  const [areasRef,   areasInView]   = useInView();
  const [ctaRef,     ctaInView]     = useInView();

  return (
    <main className="bg-white overflow-x-hidden">

      {/* ── HERO ── */}
      <section className="bg-linear-to-b from-cyan-800 to-sky-100 pt-32 pb-20 px-4">
        <div className="max-w-3xl mx-auto text-center">
          <span style={{ animation: "fadeDown 0.6s ease both" }}
            className="inline-block bg-lime-400 text-cyan-900 text-xs font-semibold
                       tracking-widest uppercase px-4 py-1 rounded-full mb-6">
            Our Story
          </span>
          <h1 style={{ animation: "fadeDown 0.6s 0.15s ease both" }}
            className="text-4xl md:text-5xl font-bold text-white leading-tight">
            About{" "}
            <span className="text-blue-300">LU</span>
            <span className="text-lime-400">Stay</span>
          </h1>
          <p style={{ animation: "fadeDown 0.6s 0.3s ease both" }}
            className="mt-5 text-gray-200 text-lg leading-relaxed max-w-2xl mx-auto">
            A secure, student-focused platform built to make finding off-campus
            accommodation around Laikipia University simple, safe, and stress-free.
          </p>
        </div>
      </section>

      {/* ── STATS ── */}
      <section className="bg-cyan-800 py-10 px-4" ref={statsRef}>
        <div className="max-w-4xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
          {statsData.map(({ end, suffix, label }, i) => (
            <div
              key={label}
              style={{
                opacity: statsInView ? 1 : 0,
                transform: statsInView ? "translateY(0)" : "translateY(32px)",
                transition: `opacity 0.6s ease ${i * 120}ms, transform 0.6s ease ${i * 120}ms`,
              }}
            >
              <p className="text-3xl font-bold text-lime-400">
                <Counter end={end} suffix={suffix} active={statsInView} />
              </p>
              <p className="text-gray-300 text-sm mt-1">{label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── MISSION ── */}
      <section className="py-20 px-4 bg-sky-50" ref={missionRef}>
        <div className="max-w-7xl mx-auto grid md:grid-cols-2 gap-14 items-center">

          {/* Left – quote card slides in from left */}
          <div
            className="relative flex justify-center"
            style={{
              opacity: missionInView ? 1 : 0,
              transform: missionInView ? "translateX(0)" : "translateX(-60px)",
              transition: "opacity 0.8s ease, transform 0.8s ease",
            }}
          >
            <div className="w-72 h-72 rounded-3xl bg-cyan-700 opacity-20 absolute -top-4 -left-4" />
            <div className="relative z-10 bg-white rounded-3xl shadow-xl p-10 text-center w-72
                            hover:shadow-2xl hover:-translate-y-1 transition-all duration-300">
              <Heart size={40} className="text-lime-500 mx-auto mb-4" />
              <p className="text-gray-700 text-sm leading-relaxed">
                "More than just a booking platform - LUStay is a solution built
                to enhance student welfare and create a safer housing ecosystem."
              </p>
              <div className="mt-5 border-t pt-4">
                <p className="text-xs text-gray-400 uppercase tracking-widest">Our Mission</p>
              </div>
            </div>
          </div>

          {/* Right – text slides in from right */}
          <div
            style={{
              opacity: missionInView ? 1 : 0,
              transform: missionInView ? "translateX(0)" : "translateX(60px)",
              transition: "opacity 0.8s ease 0.2s, transform 0.8s ease 0.2s",
            }}
          >
            <h2 className="text-3xl md:text-4xl font-bold text-gray-800 mb-5">
              Why We Built{" "}
              <span className="text-blue-600">LU</span>
              <span className="text-lime-500">Stay</span>
            </h2>
            <div className="space-y-4 text-gray-600 text-base leading-relaxed">
              <p>
                Every semester, Laikipia University students go through the same frustrating cycle: limited on-campus accommodation, scattered hostel listings across WhatsApp and Facebook groups, and the constant risk of dealing with unverified landlords.
              </p>
              <p>
                LUStay was created to solve exactly that. We built a centralized digital
                platform where students can explore, compare, and book verified hostels
                with confidence - and where hostel owners can manage their properties
                and reach students efficiently.
              </p>
              <p>
                Secure M-Pesa payments, real-time availability, and administrator-approved
                listings mean you always know what you're getting before you commit.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── FOUR PILLARS ── */}
      <section className="py-20 px-4 bg-white" ref={pillarsRef}>
        <div className="max-w-7xl mx-auto">
          <div
            className="text-center mb-12"
            style={{
              opacity: pillarsInView ? 1 : 0,
              transform: pillarsInView ? "translateY(0)" : "translateY(30px)",
              transition: "opacity 0.7s ease, transform 0.7s ease",
            }}
          >
            <h2 className="text-3xl md:text-4xl font-bold text-gray-800">
              What Sets Us Apart
            </h2>
            <p className="text-gray-500 mt-3 max-w-xl mx-auto">
              Four core commitments that make LUStay a platform students and
              hostel owners can rely on.
            </p>
          </div>

          <div className="grid gap-6 sm:grid-cols-2 md:grid-cols-4">
            {pillars.map(({ icon: Icon, color, title, desc }, i) => {
              const c = colorMap[color];
              return (
                <div
                  key={title}
                  className="group bg-white border border-gray-100 p-6 rounded-xl shadow-sm
                             hover:shadow-xl hover:-translate-y-2 hover:scale-[1.02] cursor-pointer"
                  style={{
                    opacity: pillarsInView ? 1 : 0,
                    transform: pillarsInView ? "translateY(0)" : "translateY(50px)",
                    transition: `opacity 0.6s ease ${i * 130}ms, transform 0.6s ease ${i * 130}ms,
                                 box-shadow 0.3s, scale 0.3s`,
                  }}
                >
                  <div className={`w-12 h-12 mx-auto flex items-center justify-center rounded-full
                                  ${c.bg} ${c.text} mb-4 transition-all duration-300
                                  group-hover:scale-110 ${c.hoverBg}`}>
                    <Icon size={24} />
                  </div>
                  <h3 className={`text-base font-semibold text-gray-800 text-center
                                  ${c.hoverText} transition duration-300`}>
                    {title}
                  </h3>
                  <p className="text-gray-500 text-sm mt-2 text-center leading-relaxed">
                    {desc}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── AREAS ── */}
      <section className="py-16 px-4 bg-sky-50" ref={areasRef}>
        <div className="max-w-4xl mx-auto text-center">
          <div
            style={{
              opacity: areasInView ? 1 : 0,
              transform: areasInView ? "translateY(0)" : "translateY(28px)",
              transition: "opacity 0.7s ease, transform 0.7s ease",
            }}
          >
            <h2 className="text-2xl md:text-3xl font-bold text-gray-800 mb-4">
              Areas We Cover
            </h2>
            <p className="text-gray-500 mb-8">
              We list verified hostels across all major zones around Laikipia University.
            </p>
          </div>
          <div className="flex flex-wrap justify-center gap-3">
            {areas.map((area, i) => (
              <span
                key={area}
                className="bg-white border border-cyan-200 text-cyan-800 text-sm px-4 py-1.5
                           rounded-full shadow-sm hover:bg-cyan-700 hover:text-white
                           hover:border-cyan-700 hover:scale-105 cursor-default"
                style={{
                  opacity: areasInView ? 1 : 0,
                  transform: areasInView ? "scale(1)" : "scale(0.75)",
                  transition: `opacity 0.4s ease ${i * 55}ms, transform 0.4s ease ${i * 55}ms`,
                }}
              >
                {area}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="bg-cyan-800 py-16 px-4 text-center" ref={ctaRef}>
        <h2
          className="text-3xl font-bold text-white mb-3"
          style={{
            opacity: ctaInView ? 1 : 0,
            transform: ctaInView ? "translateY(0)" : "translateY(30px)",
            transition: "opacity 0.7s ease, transform 0.7s ease",
          }}
        >
          Ready to Find Your Hostel?
        </h2>
        <p
          className="text-gray-300 mb-7 max-w-lg mx-auto"
          style={{
            opacity: ctaInView ? 1 : 0,
            transform: ctaInView ? "translateY(0)" : "translateY(30px)",
            transition: "opacity 0.7s ease 0.15s, transform 0.7s ease 0.15s",
          }}
        >
          Join hundreds of Laikipia University students who have found safe,
          affordable accommodation through LUStay.
        </p>
        <Link
          to="/hostels"
          className="bg-lime-500 text-white px-8 py-3 rounded-xl inline-block font-semibold
                    hover:bg-lime-600 hover:scale-105 active:scale-95 transition-all duration-300"
          style={{
            opacity: ctaInView ? 1 : 0,
            transform: ctaInView ? "translateY(0)" : "translateY(30px)",
            transition: "opacity 0.7s ease 0.3s, transform 0.7s ease 0.3s, background-color 0.3s, scale 0.2s",
          }}
        >
          Browse Hostels
        </Link>
      </section>

      <style>{`
        @keyframes fadeDown {
          from { opacity: 0; transform: translateY(-20px); }
          to   { opacity: 1; transform: translateY(0);     }
        }
      `}</style>

    </main>
  );
};

export default AboutUs;