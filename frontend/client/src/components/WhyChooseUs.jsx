import { ShieldCheck, Wallet, MapPin, Smartphone } from "lucide-react";

const WhyChooseUs = () => {
  return (
    <section className="bg-sky-50 py-16">
      <div className="max-w-7xl mx-auto px-4">

        {/* Header */}
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-800">
            Why Choose LUStay
          </h2>
          <p className="text-gray-500 mt-3 max-w-2xl mx-auto">
            We make finding student accommodation simple, safe, and affordable.
          </p>
        </div>

        {/* Cards */}
        <div className="grid gap-6 sm:grid-cols-2 md:grid-cols-4">

          {/* Card 1 */}
          <div className="bg-white p-6 rounded-xl shadow-md hover:shadow-lg transition duration-300 text-center">
            <div className="w-14 h-14 mx-auto flex items-center justify-center rounded-full bg-green-100 text-green-600 mb-4">
              <ShieldCheck size={26} />
            </div>
            <h3 className="text-lg font-semibold text-gray-800">
              Verified Listings
            </h3>
            <p className="text-gray-500 text-sm mt-2">
              All hostels are reviewed and verified to ensure your safety and comfort.
            </p>
          </div>

          {/* Card 2 */}
          <div className="bg-white p-6 rounded-xl shadow-md hover:shadow-lg transition duration-300 text-center">
            <div className="w-14 h-14 mx-auto flex items-center justify-center rounded-full bg-blue-100 text-blue-600 mb-4">
              <Wallet size={26} />
            </div>
            <h3 className="text-lg font-semibold text-gray-800">
              Affordable Prices
            </h3>
            <p className="text-gray-500 text-sm mt-2">
              Compare prices and find hostels that match your budget easily.
            </p>
          </div>

          {/* Card 3 */}
          <div className="bg-white p-6 rounded-xl shadow-md hover:shadow-lg transition duration-300 text-center">
            <div className="w-14 h-14 mx-auto flex items-center justify-center rounded-full bg-cyan-100 text-cyan-600 mb-4">
              <MapPin size={26} />
            </div>
            <h3 className="text-lg font-semibold text-gray-800">
              Near Campus
            </h3>
            <p className="text-gray-500 text-sm mt-2">
              Find hostels conveniently located around Laikipia University.
            </p>
          </div>

          {/* Card 4 */}
          <div className="bg-white p-6 rounded-xl shadow-md hover:shadow-lg transition duration-300 text-center">
            <div className="w-14 h-14 mx-auto flex items-center justify-center rounded-full bg-lime-100 text-lime-600 mb-4">
              <Smartphone size={26} />
            </div>
            <h3 className="text-lg font-semibold text-gray-800">
              Easy & Secure Booking
            </h3>
            <p className="text-gray-500 text-sm mt-2">
              Book instantly using mobile payments like M-Pesa. Your room is confirmed immediately after payment.
            </p>
          </div>

        </div>
      </div>
    </section>
  );
};

export default WhyChooseUs;