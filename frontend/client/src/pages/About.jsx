import React from "react";
import { Helmet } from "react-helmet-async";
import AboutUs from "../components/AboutUs";
import Footer from "../components/Footer";

const About = () => {
  return (
    <>
      <Helmet>
        <title>About Us — LUStay</title>
        <meta name="description" content="Learn about LUStay — our mission to connect students with verified, affordable hostels near universities across Kenya." />
        <link rel="canonical" href="https://lustay.vercel.app/about" />
        <meta property="og:url" content="https://lustay.vercel.app/about" />
        <meta property="og:title" content="About Us — LUStay" />
        <meta property="og:description" content="Learn about LUStay — our mission to connect students with verified, affordable hostels near universities across Kenya." />
      </Helmet>

      <AboutUs />
      <Footer />
    </>
  );
};

export default About;