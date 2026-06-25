"use client";

import { useState } from "react";

type AuthMode = "login" | "register" | "forgot";

export default function AuthForm() {
  const [mode, setMode] = useState<AuthMode>("login");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [resetToken, setResetToken] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [generatedToken, setGeneratedToken] = useState("");

  const [loading, setLoading] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function handleLoginOrRegister(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    setError("");
    setSuccess("");

    if (mode === "register" && password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);

    try {
      const endpoint =
        mode === "login"
          ? "/api/authentication/login"
          : "/api/authentication/register";

      const response = await fetch(endpoint, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email,
          password,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Request failed.");
      }

      if (mode === "login") {
        window.location.href = "/";
      } else {
        setSuccess("Account created successfully. You may now login.");

        setMode("login");

        setPassword("");
        setConfirmPassword("");
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Unexpected error occurred.",
      );
    }

    setLoading(false);
  }

  async function requestResetToken() {
    setError("");
    setSuccess("");

    if (!email) {
      setError("Please enter your email first.");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch("/api/authentication/forgot-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Request failed.");
      }

      setGeneratedToken(data.token);

      setSuccess("Reset token generated successfully.");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Unexpected error occurred.",
      );
    }

    setLoading(false);
  }

  async function handleResetPassword(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    setError("");
    setSuccess("");

    setLoading(true);

    try {
      const response = await fetch("/api/authentication/reset-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email,
          token: resetToken,
          newPassword,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Reset failed.");
      }

      setSuccess("Password reset successfully. Please login.");

      setGeneratedToken("");
      setResetToken("");
      setNewPassword("");

      setMode("login");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Unexpected error occurred.",
      );
    }

    setLoading(false);
  }

  return (
    <div className="auth-container">
      <div className="auth-card">
        <h1 className="auth-title">
          {mode === "login" && "Welcome Back"}
          {mode === "register" && "Create Account"}
          {mode === "forgot" && "Reset Password"}
        </h1>

        <p className="auth-subtitle">
          {mode === "login" && "Sign in to continue shopping."}
          {mode === "register" && "Create your account to get started."}
          {mode === "forgot" &&
            "Generate a reset token and choose a new password."}
        </p>

        {(mode === "login" || mode === "register") && (
          <form onSubmit={handleLoginOrRegister}>
            <div className="auth-group">
              <label>Email Address</label>
              <input
                className="input"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <div className="auth-group">
              <label>Password</label>
              <input
                className="input"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>

            {mode === "register" && (
              <div className="auth-group">
                <label>Confirm Password</label>
                <input
                  className="input"
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                />
              </div>
            )}
            {mode === "login" && (
              <div className="auth-forgot mt-2 text-right">
                <button
                  type="button"
                  onClick={() => setMode("forgot")}
                  className="text-sm text-blue-600 hover:text-blue-800 hover:underline bg-transparent border-none p-0 cursor-pointer transition-colors"
                >
                  Forgot your password?
                </button>
              </div>
            )}

            {error && <p className="auth-error mt-2">{error}</p>}
            {success && <p className="auth-success mt-2">{success}</p>}

            <button className="btn btn-primary w-full mt-4" disabled={loading}>
              {loading
                ? "Please wait..."
                : mode === "login"
                  ? "Login"
                  : "Create Account"}
            </button>

            <div className="auth-switch mt-4 text-center text-sm text-gray-600">
              {mode === "login" ? (
                <>
                  Don't have an account?{" "}
                  <button
                    type="button"
                    onClick={() => setMode("register")}
                    className="text-blue-600 hover:text-blue-800 hover:underline bg-transparent border-none p-0 cursor-pointer font-medium"
                  >
                    Sign Up
                  </button>
                </>
              ) : (
                <>
                  Already have an account?{" "}
                  <button
                    type="button"
                    onClick={() => setMode("login")}
                    className="text-blue-600 hover:text-blue-800 hover:underline bg-transparent border-none p-0 cursor-pointer font-medium"
                  >
                    Login
                  </button>
                </>
              )}
            </div>
          </form>
        )}

        {mode === "forgot" && (
          <form onSubmit={handleResetPassword}>
            <div className="auth-group">
              <label>Email Address</label>
              <input
                className="input"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <button
              type="button"
              className="btn btn-secondary w-full mt-2"
              onClick={requestResetToken}
              disabled={loading}
            >
              Request Reset Token
            </button>

            {generatedToken && (
              <div className="mt-2">
                <p className="text-sm text-gray-500">Development Mode Token:</p>
                <div className="reset-token-box p-2 bg-gray-100 border rounded font-mono text-center my-1 text-sm">
                  {generatedToken}
                </div>
              </div>
            )}

            <div className="auth-group mt-4">
              <label>Reset Token</label>
              <input
                className="input"
                type="text"
                value={resetToken}
                onChange={(e) => setResetToken(e.target.value)}
              />
            </div>

            <div className="auth-group">
              <label>New Password</label>
              <input
                className="input"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
              />
            </div>

            {error && <p className="auth-error mt-2">{error}</p>}
            {success && <p className="auth-success mt-2">{success}</p>}

            <button className="btn btn-primary w-full mt-4" disabled={loading}>
              Reset Password
            </button>

            <div className="auth-switch mt-4 text-center">
              <button
                type="button"
                onClick={() => setMode("login")}
                className="text-sm text-blue-600 hover:text-blue-800 hover:underline bg-transparent border-none p-0 cursor-pointer"
              >
                Back to Login
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
