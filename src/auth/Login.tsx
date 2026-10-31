import { useState, type FormEvent } from "react";
import { supabase } from "../lib/supabase";
import "./Login.css";

export default function Login() {
  const [mode, setMode] = useState<"signin" | "reset">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError(""); setInfo(""); setBusy(true);
    if (mode === "signin") {
      const { error: err } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
      // one generic message: don't reveal whether the email exists
      if (err) setError("Invalid email or password.");
    } else {
      await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo: window.location.origin });
      setInfo("If that email has an account, a reset link is on its way.");
    }
    setBusy(false);
  };

  return (
    <div className="login-wrap">
      <form className="login-card" onSubmit={submit}>
        <div className="login-brand"><span>∞</span> Brightloop</div>
        <h1>{mode === "signin" ? "Sign in" : "Reset password"}</h1>
        <label>Email
          <input type="email" required autoComplete="email" value={email}
            onChange={(e) => setEmail(e.target.value)} />
        </label>
        {mode === "signin" && (
          <label>Password
            <input type="password" required autoComplete="current-password" value={password}
              onChange={(e) => setPassword(e.target.value)} />
          </label>
        )}
        {error && <p className="login-error" role="alert">{error}</p>}
        {info && <p className="login-info">{info}</p>}
        <button type="submit" disabled={busy}>
          {busy ? "Please wait…" : mode === "signin" ? "Sign in" : "Send reset link"}
        </button>
        <button type="button" className="login-link"
          onClick={() => { setMode(mode === "signin" ? "reset" : "signin"); setError(""); setInfo(""); }}>
          {mode === "signin" ? "Forgot password?" : "Back to sign in"}
        </button>
        <p className="login-note">Access is by invitation only. Ask an administrator for an invite.</p>
      </form>
    </div>
  );
}
