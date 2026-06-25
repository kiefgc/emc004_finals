"use client";

import { useState } from "react";

export default function ProfileActions() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [message, setMessage] = useState("");

  async function handlePasswordChange() {
    if (newPassword !== confirmPassword) {
      setMessage("Passwords do not match.");
      return;
    }

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
      setMessage(data.error);
      return;
    }

    setMessage("Password updated successfully.");

    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
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

    const response = await fetch("/api/authentication/profile", {
      method: "DELETE",
    });

    if (response.ok) {
      window.location.href = "/";
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

      {message && <p className="auth-success">{message}</p>}

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
