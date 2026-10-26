
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { activateCustomer, signIn, signUp } from "../services/api";

export default function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMessage("");
    setLoading(true);

    try {
      if (mode === "register") {
        const result = await signUp(name, email, password);

        if (!result.session) {
          setMessage(
            "Account created. Check your email for the verification link, then sign in."
          );
          return;
        }

        await activateCustomer();
      } else {
        await signIn(email, password);
        await activateCustomer();
      }

      navigate("/store");
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Authentication failed"
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="ac-auth">
      <Link to="/store">← Back to store</Link>

      <div className="ac-panel">
        <h1>MarketLens</h1>
        <p>
          {mode === "login"
            ? "Sign in to contact local dealers."
            : "Create your customer account."}
        </p>

        <form onSubmit={handleSubmit} className="ac-form">
          {mode === "register" && (
            <label>
              Full name
              <input
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </label>
          )}

          <label>
            Email address
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </label>

          <label>
            Password
            <input
              type="password"
              minLength={8}
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </label>

          <button disabled={loading} type="submit">
            {loading
              ? "Please wait..."
              : mode === "login"
              ? "Sign in"
              : "Create account"}
          </button>
        </form>

        {message && <p role="status">{message}</p>}

        <button
          className="ac-text-button"
          onClick={() => {
            setMode(mode === "login" ? "register" : "login");
            setMessage("");
          }}
        >
          {mode === "login"
            ? "New customer? Create an account"
            : "Already registered? Sign in"}
        </button>
      </div>
    </main>
  );
}
