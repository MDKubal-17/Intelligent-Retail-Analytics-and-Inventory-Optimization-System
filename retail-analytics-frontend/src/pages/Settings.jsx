import React, { useState, useEffect } from "react";
import Layout from "../components/Layout";

export const Settings = () => {
  // Read user from logged-in session
  const storedUser =
    JSON.parse(localStorage.getItem("user")) || {
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

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("theme", theme);
  }, [theme]);

  const handleUpdate = async (e) => {
    e.preventDefault();

    setMessage({
      type: "",
      text: "",
    });

    if (passwords.new && passwords.new !== passwords.confirm) {
      setMessage({
        type: "error",
        text: "New passwords do not match!",
      });
      return;
    }

    if (passwords.new && !passwords.current) {
      setMessage({
        type: "error",
        text: "Current password is required to set a new password.",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch(
        "http://localhost:5000/api/auth/update-settings",
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            userId: storedUser.id,
            email,
            currentPassword: passwords.current,
            newPassword: passwords.new,
          }),
        }
      );

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

        setPasswords({
          current: "",
          new: "",
          confirm: "",
        });
      } else {
        setMessage({
          type: "error",
          text: data.message || "Failed to update settings.",
        });
      }
    } catch (err) {
      setMessage({
        type: "error",
        text: "Server unreachable. Check backend status.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Layout>
      <div>
        {/* Page Heading */}
        <h1 className="text-3xl font-bold mb-2">
          Settings
        </h1>

        <p className="text-gray-500 mb-8">
          Manage your account and application preferences.
        </p>

        {/* Message */}
        {message.text && (
          <div
            className={`mb-6 p-4 rounded-lg ${
              message.type === "error"
                ? "bg-red-100 text-red-700"
                : "bg-green-100 text-green-700"
            }`}
          >
            {message.text}
          </div>
        )}

        <form onSubmit={handleUpdate}>

          {/* Account Settings */}
          <div className="bg-white rounded-xl shadow-md p-6 mb-6">

            <h2 className="text-xl font-bold mb-6">
              👤 User Credentials
            </h2>

            <div className="mb-5">

              <label className="block font-medium mb-2">
                Email Address
              </label>

              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />

            </div>

            <div className="mb-5">

              <label className="block font-medium mb-2">
                Current Password
              </label>

              <input
                type="password"
                value={passwords.current}
                onChange={(e) =>
                  setPasswords({
                    ...passwords,
                    current: e.target.value,
                  })
                }
                className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />

            </div>

            <div className="mb-5">

              <label className="block font-medium mb-2">
                New Password
              </label>

              <input
                type="password"
                value={passwords.new}
                onChange={(e) =>
                  setPasswords({
                    ...passwords,
                    new: e.target.value,
                  })
                }
                className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />

            </div>

            <div>

              <label className="block font-medium mb-2">
                Confirm Password
              </label>

              <input
                type="password"
                value={passwords.confirm}
                onChange={(e) =>
                  setPasswords({
                    ...passwords,
                    confirm: e.target.value,
                  })
                }
                className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />

            </div>

          </div>

          {/* Appearance */}
          <div className="bg-white rounded-xl shadow-md p-6 mb-6">

            <h2 className="text-xl font-bold mb-6">
              🎨 Appearance
            </h2>

            <label className="block font-medium mb-2">
              Theme
            </label>

            <select
              value={theme}
              onChange={(e) => setTheme(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="light">
                ☀️ Light Theme
              </option>

              <option value="dark">
                🌙 Dark Theme
              </option>
            </select>

          </div>

          {/* Save Button */}
          <button
            type="submit"
            disabled={isSubmitting}
            className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {isSubmitting ? "Saving..." : "Save Settings"}
          </button>

        </form>
      </div>
    </Layout>
  );
};

export default Settings;
