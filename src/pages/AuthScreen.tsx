import { useState } from "react";
import { MailCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/cloud/AuthContext";

type Mode = "signin" | "signup" | "forgot";
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary font-bold text-primary-foreground">M</span>
          <span className="text-lg font-semibold tracking-tight">Money Matter</span>
        </div>
        {children}
      </div>
    </div>
  );
}

export default function AuthScreen() {
  const { signIn, signUp, sendResetEmail } = useAuth();
  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState<"confirm" | "reset" | null>(null);

  const switchMode = (m: Mode) => {
    setMode(m);
    setError("");
    setNotice(null);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!EMAIL_RE.test(email.trim())) return setError("Enter a valid email address.");
    if (mode !== "forgot" && password.length < 8) return setError("Password must be at least 8 characters.");
    setBusy(true);
    try {
      if (mode === "signin") {
        const r = await signIn(email, password);
        if (r.error) setError(r.error);
      } else if (mode === "signup") {
        const r = await signUp(email, password);
        if (r.error) setError(r.error);
        else if (r.needsConfirmation) setNotice("confirm");
      } else {
        const r = await sendResetEmail(email);
        if (r.error) setError(r.error);
        else setNotice("reset");
      }
    } finally {
      setBusy(false);
    }
  };

  if (notice) {
    return (
      <Shell>
        <div className="text-center">
          <MailCheck className="mx-auto mb-3 h-10 w-10 text-primary" />
          <h1 className="text-xl font-semibold">Check your email</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {notice === "confirm"
              ? `We sent a confirmation link to ${email.trim()}. Open it to finish creating your account.`
              : `If an account exists for ${email.trim()}, a reset link is on its way.`}
          </p>
          <Button variant="ghost" className="mt-4" onClick={() => switchMode("signin")}>
            Back to sign in
          </Button>
        </div>
      </Shell>
    );
  }

  const title = mode === "signin" ? "Welcome back" : mode === "signup" ? "Create your account" : "Reset your password";
  return (
    <Shell>
      <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        {mode === "forgot" ? "We'll email you a link to choose a new one." : "Your money data is private to you and synced across your devices."}
      </p>
      <form onSubmit={submit} className="mt-6 space-y-3" noValidate>
        <div>
          <Label htmlFor="auth-email" className="mb-1.5 block text-sm">Email</Label>
          <Input id="auth-email" type="email" autoComplete="email" autoFocus value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        {mode !== "forgot" && (
          <div>
            <Label htmlFor="auth-password" className="mb-1.5 block text-sm">Password</Label>
            <Input
              id="auth-password"
              type="password"
              autoComplete={mode === "signin" ? "current-password" : "new-password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            {mode === "signup" && <p className="mt-1 text-xs text-muted-foreground">At least 8 characters.</p>}
          </div>
        )}
        {error && (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}
        <Button type="submit" className="w-full" size="lg" disabled={busy}>
          {busy ? "One moment…" : mode === "signin" ? "Sign in" : mode === "signup" ? "Create account" : "Send reset link"}
        </Button>
      </form>
      <div className="mt-4 flex flex-col items-center gap-1.5 text-sm">
        {mode === "signin" && (
          <>
            <button className="text-muted-foreground hover:text-foreground" onClick={() => switchMode("forgot")}>
              Forgot password?
            </button>
            <button className="font-medium text-primary hover:underline" onClick={() => switchMode("signup")}>
              New here? Create an account
            </button>
          </>
        )}
        {mode !== "signin" && (
          <button className="font-medium text-primary hover:underline" onClick={() => switchMode("signin")}>
            Back to sign in
          </button>
        )}
      </div>
    </Shell>
  );
}

export function SetNewPassword() {
  const { setNewPassword } = useAuth();
  const [pw, setPw] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pw.length < 8) return setError("Password must be at least 8 characters.");
    setBusy(true);
    const r = await setNewPassword(pw);
    setBusy(false);
    if (r.error) setError(r.error);
  };

  return (
    <Shell>
      <h1 className="text-2xl font-semibold tracking-tight">Choose a new password</h1>
      <form onSubmit={submit} className="mt-6 space-y-3">
        <div>
          <Label htmlFor="new-password" className="mb-1.5 block text-sm">New password</Label>
          <Input id="new-password" type="password" autoComplete="new-password" autoFocus value={pw} onChange={(e) => setPw(e.target.value)} />
        </div>
        {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
        <Button type="submit" className="w-full" size="lg" disabled={busy}>
          Save password
        </Button>
      </form>
    </Shell>
  );
}
