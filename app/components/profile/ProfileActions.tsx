"use client";

import { useState } from "react";

export default function ProfileActions() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [message, setMessage] = useState("");
  const [isError, setIsError] = useState(false); // Track if the message is an error

  async function handlePasswordChange() {
    setMessage("");
    setIsError(false);

    // 1. Check matching passwords
    if (newPassword !== confirmPassword) {
      setIsError(true);
      setMessage("Passwords do not match.");
      return;
    }

    // 2. Validate strength using regex
    const passwordRegex = /^(?=.*[^A-Za-z0-9])(?=.*\d).{8,}$/;
    if (!passwordRegex.test(newPassword)) {
      setIsError(true);
      setMessage(
        "Password must be at least 8 characters long and contain at least one special character.",
      );
      return;
    }

    try {
      const response = await fetch("/api/authentication/profile", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          currentPassword,
          newPassword,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setIsError(true);
        setMessage(data.error || "An error occurred.");
        return;
      }

      setIsError(false);
      setMessage("Password updated successfully.");

      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err) {
      setIsError(true);
      setMessage("Failed to connect to the server.");
    }
  }

  async function handleLogout() {
    await fetch("/api/authentication/logout", {
      method: "POST",
    });

    window.location.href = "/";
  }

  async function handleDeleteAccount() {
    const confirmed = confirm("Delete account permanently?");

    if (!confirmed) return;

    try {
      const response = await fetch("/api/authentication/profile", {
        method: "DELETE",
      });

      if (response.ok) {
        window.location.href = "/";
      } else {
        const data = await response.json();
        setIsError(true);
        setMessage(data.error || "Could not delete account.");
      }
    } catch (err) {
      setIsError(true);
      setMessage("Failed to connect to the server.");
    }
  }

  return (
    <div className="card mt-4">
      <h2>Security</h2>

      <div className="auth-group">
        <label>Current Password</label>
        <input
          type="password"
          className="input"
          value={currentPassword}
          onChange={(e) => setCurrentPassword(e.target.value)}
        />
      </div>

      <div className="auth-group">
        <label>New Password</label>
        <input
          type="password"
          className="input"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
        />
      </div>

      <div className="auth-group">
        <label>Confirm Password</label>
        <input
          type="password"
          className="input"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
        />
      </div>

      {/* Dynamic Styling applied here */}
      {message && (
        <p className={isError ? "auth-error" : "auth-success"}>{message}</p>
      )}

      <button className="btn btn-primary" onClick={handlePasswordChange}>
        Change Password
      </button>

      <div className="mt-4">
        <h2>Danger Zone</h2>
        <div
          className="flex mt-2"
          style={{
            gap: "1rem",
          }}
        >
          <button className="btn btn-secondary" onClick={handleLogout}>
            Logout
          </button>

          <button className="btn btn-danger" onClick={handleDeleteAccount}>
            Delete Account
          </button>
        </div>
      </div>
    </div>
  );
}
