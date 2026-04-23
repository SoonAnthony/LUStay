import { useState } from "react";
import { requestEmailChange } from "../api/account";
import Footer from "../components/Footer";

const ChangeEmail = () => {
  const [form, setForm] = useState({
    new_email: "",
    password: "",
  });

  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState(""); // success | error
  const [message, setMessage] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setStatus("");
    setMessage("");

    try {
      await requestEmailChange(form);
      setStatus("success");
      setMessage("Check your new email to confirm the change.");
      setForm({ new_email: "", password: "" });
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

          <h1 className="text-lg font-semibold mb-4">Change Email</h1>

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
              type="email"
              placeholder="New email"
              value={form.new_email}
              onChange={(e) =>
                setForm({ ...form, new_email: e.target.value })
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

export default ChangeEmail;