"use client";

import { useState } from "react";
// Imported your custom ConfirmModal
import ConfirmModal from "@/app/components/ui/ConfirmModal";

export default function ProfileActions() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [message, setMessage] = useState("");
  const [isError, setIsError] = useState(false);

  // States to control the account deletion modal wrapper
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function handlePasswordChange() {
    setMessage("");
    setIsError(false);

    if (newPassword !== confirmPassword) {
      setIsError(true);
      setMessage("Passwords do not match.");
      return;
    }

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

  // Separated the actual API execution logic for the modal's confirm hook
  async function executeAccountDeletion() {
    try {
      setDeleting(true);
      setMessage("");

      const response = await fetch("/api/authentication/profile", {
        method: "DELETE",
        // Added credentials header here. If your authentication is cookie-based,
        // omitting this will cause the route to think you are unauthenticated!
        credentials: "include",
      });

      if (response.ok) {
        setShowDeleteConfirm(false);
        window.location.href = "/";
      } else {
        const data = await response.json();
        setIsError(true);
        setMessage(data.error || "Could not delete account.");
        setShowDeleteConfirm(false);
      }
    } catch (err) {
      setIsError(true);
      setMessage("Failed to connect to the server.");
      setShowDeleteConfirm(false);
    } finally {
      setDeleting(false);
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
          value={currentPassword || ""}
          onChange={(e) => setCurrentPassword(e.target.value)}
        />
      </div>

      <div className="auth-group">
        <label>New Password</label>
        <input
          type="password"
          className="input"
          value={newPassword || ""}
          onChange={(e) => setNewPassword(e.target.value)}
        />
      </div>

      <div className="auth-group">
        <label>Confirm Password</label>
        <input
          type="password"
          className="input"
          value={confirmPassword || ""}
          onChange={(e) => setConfirmPassword(e.target.value)}
        />
      </div>

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

          {/* This button now safely prompts your clean UI modal overlay */}
          <button
            className="btn btn-danger"
            onClick={() => setShowDeleteConfirm(true)}
          >
            Delete Account
          </button>
        </div>
      </div>

      {/* Account Deletion Confirmation Modal */}
      <ConfirmModal
        open={showDeleteConfirm}
        title="Delete Account Permanently?"
        message="Are you absolutely sure? This action is irreversible and all your user data, profile records, and history will be completely wiped out."
        confirmText={deleting ? "Deleting..." : "Yes, Delete My Account"}
        danger
        onCancel={() => setShowDeleteConfirm(false)}
        onConfirm={executeAccountDeletion}
      />
    </div>
  );
}
