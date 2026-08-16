import React, { useState, useEffect } from "react";
import Layout from "../components/Layout";

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

export const Settings = () => {
  // Read user from logged-in session
  const storedUser = JSON.parse(localStorage.getItem("user")) || {
    id: "",
    email: "admin@retail.com",
  };

  const [email, setEmail] = useState(storedUser.email);

  const [passwords, setPasswords] = useState({
    current: "",
    new: "",
    confirm: "",
  });

  const [theme, setTheme] = useState(
    localStorage.getItem("theme") || "light"
  );

  const [message, setMessage] = useState({
    type: "",
    text: "",
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  // Synchronize theme attribute and Tailwind dark class on <html>
  useEffect(() => {
    const root = document.documentElement;
    root.setAttribute("data-theme", theme);
    localStorage.setItem("theme", theme);

    if (theme === "dark") {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }
  }, [theme]);

  const handleUpdate = async (e) => {
    e.preventDefault();

    setMessage({ type: "", text: "" });

    // Block password change for this phase as requested
    if (passwords.current || passwords.new || passwords.confirm) {
      setMessage({
        type: "error",
        text: "Password updates are currently disabled in this phase.",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/update-settings`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId: storedUser.id,
          email,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setMessage({
          type: "success",
          text: data.message || "Settings updated successfully!",
        });

        localStorage.setItem(
          "user",
          JSON.stringify({
            ...storedUser,
            email,
          })
        );
      } else {
        setMessage({
          type: "error",
          text: data.message || "Failed to update settings.",
        });
      }
    } catch (err) {
      // If API server is optional for pure theme/local settings, save local state
      setMessage({
        type: "success",
        text: "Preferences saved locally.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Layout>
      <div className="text-slate-900 dark:text-slate-100 min-h-screen transition-colors duration-200">
        {/* Page Heading */}
        <h1 className="text-3xl font-bold mb-2">Settings</h1>

        <p className="text-gray-500 dark:text-gray-400 mb-8">
          Manage your account and application preferences.
        </p>

        {/* Message Alert */}
        {message.text && (
          <div
            className={`mb-6 p-4 rounded-lg font-medium ${
              message.type === "error"
                ? "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300"
                : "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300"
            }`}
          >
            {message.text}
          </div>
        )}

        <form onSubmit={handleUpdate}>
          {/* Account Settings */}
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-md p-6 mb-6 transition-colors duration-200">
            <h2 className="text-xl font-bold mb-6 text-slate-800 dark:text-white">
              👤 User Credentials
            </h2>

            <div className="mb-5">
              <label className="block font-medium mb-2 text-slate-700 dark:text-slate-200">
                Email Address
              </label>

              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full border border-gray-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="mb-5">
              <label className="block font-medium mb-2 text-slate-700 dark:text-slate-200">
                Current Password
              </label>

              <input
                type="password"
                placeholder="Disabled in this phase"
                value={passwords.current}
                onChange={(e) =>
                  setPasswords({ ...passwords, current: e.target.value })
                }
                className="w-full border border-gray-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="mb-5">
              <label className="block font-medium mb-2 text-slate-700 dark:text-slate-200">
                New Password
              </label>

              <input
                type="password"
                placeholder="Disabled in this phase"
                value={passwords.new}
                onChange={(e) =>
                  setPasswords({ ...passwords, new: e.target.value })
                }
                className="w-full border border-gray-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block font-medium mb-2 text-slate-700 dark:text-slate-200">
                Confirm Password
              </label>

              <input
                type="password"
                placeholder="Disabled in this phase"
                value={passwords.confirm}
                onChange={(e) =>
                  setPasswords({ ...passwords, confirm: e.target.value })
                }
                className="w-full border border-gray-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Appearance */}
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-md p-6 mb-6 transition-colors duration-200">
            <h2 className="text-xl font-bold mb-6 text-slate-800 dark:text-white">
              🎨 Appearance
            </h2>

            <label className="block font-medium mb-2 text-slate-700 dark:text-slate-200">
              Theme
            </label>

            <select
              value={theme}
              onChange={(e) => setTheme(e.target.value)}
              className="w-full border border-gray-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="light">☀️ Light Theme</option>
              <option value="dark">🌙 Dark Theme</option>
            </select>
          </div>

          {/* Save Button */}
          <button
            type="submit"
            disabled={isSubmitting}
            className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {isSubmitting ? "Saving..." : "Save Settings"}
          </button>
        </form>
      </div>
    </Layout>
  );
};

export default Settings;
