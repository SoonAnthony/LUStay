import { Helmet } from "react-helmet-async";
import Hero from "../components/Hero";
import FeaturedHostelsSection from "../components/FeaturedHostelsSection";
import WhyChooseUs from "../components/WhyChooseUs";
import Footer from "../components/Footer";

const Home = () => {
  return (
    <>
      <Helmet>
        <title>LUStay — Find Student Hostels in Kenya</title>
        <meta name="description" content="Discover and book verified, affordable student hostels near your university in Kenya. Safe, convenient accommodation made simple." />
        <link rel="canonical" href="https://lustay.vercel.app/" />
        <meta property="og:url" content="https://lustay.vercel.app/" />
        <meta property="og:title" content="LUStay — Find Student Hostels in Kenya" />
        <meta property="og:description" content="Discover and book verified, affordable student hostels near your university in Kenya." />
      </Helmet>

      <Hero />
      <FeaturedHostelsSection />
      <WhyChooseUs />
      <Footer />
    </>
  );
};

export default Home;