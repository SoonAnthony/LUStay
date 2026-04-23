import { useState } from "react";
import { requestPhoneChange } from "../api/account";
import Footer from "../components/Footer";

const ChangePhone = () => {
  const [form, setForm] = useState({
    new_phone: "",
    password: "",
  });

  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState("");
  const [message, setMessage] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setStatus("");
    setMessage("");

    try {
      await requestPhoneChange(form);
      setStatus("success");
      setMessage("Check your email to confirm phone change.");
      setForm({ new_phone: "", password: "" });
    } catch (err) {
      setStatus("error");
      setMessage(err?.response?.data?.detail || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="min-h-screen bg-gray-50 pt-24 px-4">
        <div className="max-w-md mx-auto bg-white border border-gray-100 rounded-2xl p-6">

          <h1 className="text-lg font-semibold mb-4">Change Phone Number</h1>

          {message && (
            <div
              className={`mb-3 text-sm p-3 rounded-xl ${
                status === "success"
                  ? "bg-green-50 text-green-600"
                  : "bg-red-50 text-red-500"
              }`}
            >
              {message}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">

            <input
              type="text"
              placeholder="New phone (07XXXXXXXX)"
              value={form.new_phone}
              onChange={(e) =>
                setForm({ ...form, new_phone: e.target.value })
              }
              className="w-full border px-4 py-2 rounded-xl text-sm"
              required
            />

            <input
              type="password"
              placeholder="Current password"
              value={form.password}
              onChange={(e) =>
                setForm({ ...form, password: e.target.value })
              }
              className="w-full border px-4 py-2 rounded-xl text-sm"
              required
            />

            <button
              disabled={loading}
              className="w-full bg-blue-500 text-white py-2 rounded-xl text-sm"
            >
              {loading ? "Sending..." : "Request Change"}
            </button>

          </form>
        </div>
      </div>
      <Footer />
    </>
  );
};

export default ChangePhone;