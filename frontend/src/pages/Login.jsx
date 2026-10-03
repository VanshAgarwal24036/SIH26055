import { useState } from "react";
import {
  Eye,
  EyeOff,
  Radio,
  ShieldCheck,
  ArrowRight,
} from "lucide-react";
import { useNavigate } from "react-router-dom";

import { useAuth } from "../context/AuthContext";

const ROLES = [
  {
    value: "Authorized User",
    description: "System access and monitoring",
  },
  {
    value: "EW Analyst / Operator",
    description: "Live RF monitoring and scan control",
  },
  {
    value: "ML Engineer / Researcher",
    description: "Models, experiments and analysis",
  },
  {
    value: "Evaluator / Viewer",
    description: "Performance and reporting access",
  },
];

export default function Login() {
  const navigate = useNavigate();
  const { login } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("EW Analyst / Operator");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = (event) => {
    event.preventDefault();
    setError("");

    if (!email.trim()) {
      setError("Enter your user ID or email.");
      return;
    }

    if (!password.trim()) {
      setError("Enter your password.");
      return;
    }

    login({
      email: email.trim(),
      role,
    });

    navigate("/dashboard");
  };

  return (
    <div className="login-page">
      <div className="login-background-grid" />

      <div className="login-shell">
        {/* Brand panel */}
        <section className="login-brand-panel">
          <div className="brand-mark">
            <Radio size={24} />
          </div>

          <div className="brand-kicker">
            SMART SCAN SYSTEM
          </div>

          <h1>
            SPECTRA
            <span>SHAKTI</span>
          </h1>

          <p className="brand-description">
            Intelligent RF Spectrum Scan &amp;
            Adaptive Receiver Scheduling
          </p>

          <div className="brand-status">
            <span className="status-dot" />
            Simulation System Ready
          </div>

          <div className="brand-info">
            <div>
              <span>Frequency Bands</span>
              <strong>20</strong>
            </div>

            <div>
              <span>RF Emitters</span>
              <strong>8</strong>
            </div>

            <div>
              <span>Environment</span>
              <strong>SIM</strong>
            </div>
          </div>
        </section>

        {/* Login form */}
        <section className="login-card">
          <div className="login-card-header">
            <div>
              <p className="eyebrow">
                SECURE SYSTEM ACCESS
              </p>

              <h2>Welcome back</h2>

              <p>
                Sign in to access the Spectra Shakti
                control dashboard.
              </p>
            </div>

            <div className="security-icon">
              <ShieldCheck size={22} />
            </div>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label htmlFor="email">
                User ID / Email
              </label>

              <input
                id="email"
                type="email"
                placeholder="operator@spectrashakti.ai"
                value={email}
                onChange={(event) =>
                  setEmail(event.target.value)
                }
              />
            </div>

            <div className="form-group">
              <label htmlFor="password">
                Password
              </label>

              <div className="password-wrapper">
                <input
                  id="password"
                  type={
                    showPassword
                      ? "text"
                      : "password"
                  }
                  placeholder="Enter your password"
                  value={password}
                  onChange={(event) =>
                    setPassword(event.target.value)
                  }
                />

                <button
                  type="button"
                  className="password-toggle"
                  onClick={() =>
                    setShowPassword(
                      (value) => !value
                    )
                  }
                  aria-label="Toggle password visibility"
                >
                  {showPassword ? (
                    <EyeOff size={18} />
                  ) : (
                    <Eye size={18} />
                  )}
                </button>
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="role">
                Access Role
              </label>

              <select
                id="role"
                value={role}
                onChange={(event) =>
                  setRole(event.target.value)
                }
              >
                {ROLES.map((item) => (
                  <option
                    key={item.value}
                    value={item.value}
                  >
                    {item.value}
                  </option>
                ))}
              </select>

              <span className="role-description">
                {
                  ROLES.find(
                    (item) =>
                      item.value === role
                  )?.description
                }
              </span>
            </div>

            {error && (
              <div className="login-error">
                {error}
              </div>
            )}

            <button
              type="submit"
              className="login-button"
            >
              <span>ENTER SPECTRA SHAKTI</span>
              <ArrowRight size={17} />
            </button>
          </form>

          <div className="login-footer">
            <span>Prototype Environment</span>
            <span>v0.1.0</span>
          </div>
        </section>
      </div>
    </div>
  );
}