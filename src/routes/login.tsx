import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { memberApi, memberToken } from "@/lib/member-api";
import { useEffect, useRef, useState } from "react";
import { NEEL_LINKS } from "@/components/neel-frame";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Member Login — Life OS" },
      { name: "description", content: "Sign in to your Life OS member account." },
      { property: "og:title", content: "Member Login — Life OS" },
      { property: "og:description", content: "Sign in to your Life OS member account." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
    links: NEEL_LINKS,
  }),
  component: Login,
});

/** Reference index.php login: glass form, three centred fields, image captcha, Login / Cancel. */
function Login() {
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [captcha, setCaptcha] = useState<{ challenge_id: string; image: string } | null>(null);
  const [loadingCaptcha, setLoadingCaptcha] = useState(true);
  const codeInput = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  const refreshCaptcha = async () => {
    setLoadingCaptcha(true); setCaptcha(null);
    if (codeInput.current) codeInput.current.value = "";
    try { setCaptcha(await memberApi<{ challenge_id: string; image: string }>("/captcha")); }
    catch { setErr("Security code is unavailable. Please try again."); }
    finally { setLoadingCaptcha(false); }
  };
  useEffect(() => { void refreshCaptcha(); }, []);
  const submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    if (!captcha || loadingCaptcha) return;
    setErr(null); setBusy(true);
    try {
      memberToken.clear();
      const r = await memberApi<{ token: string }>("/login", { body: { username: fd.get("username"), password: fd.get("password"), challenge_id: captcha.challenge_id, security_code: fd.get("security_code") } });
      memberToken.set(r.token);
      navigate({ to: "/member" });
    } catch (x) {
      setErr((x as Error).message === "Failed to fetch" ? "Member server is not reachable right now." : (x as Error).message);
      await refreshCaptcha();
    } finally { setBusy(false); }
  };
  return (
    <div className="neel-viewport neel-login-page">
      <div className="lo-login-wrap">
        <div className="login_logo" />
        <form className="form" onSubmit={submit} autoComplete="off">
          <br />
          <table width={240} cellPadding={5} cellSpacing={5}>
            <tbody>
              <tr><td align="center"><Link to="/" aria-label="Life OS home"><img src="/member-kit/neel/logo-word.png" alt="Life OS" style={{ height: 60, width: "auto" }} /></Link></td></tr>
              <tr><td><input type="text" name="username" aria-label="Account Login User ID" placeholder="Account Login User ID" required autoComplete="username" /></td></tr>
              <tr><td><input type="password" name="password" aria-label="Account Login Password" placeholder="Account Login Password" required autoComplete="current-password" /></td></tr>
              <tr><td><input ref={codeInput} type="text" name="security_code" aria-label="Login Capcha Code" placeholder="Login Capcha Code" required pattern="[0-9]{4}" maxLength={4} inputMode="numeric" /></td></tr>
              <tr>
                <td style={{ textAlign: "center" }}>
                  <button type="button" className="lo-captcha-btn" aria-label="Refresh security code" title="Refresh security code" disabled={loadingCaptcha || busy} onClick={() => { setErr(null); void refreshCaptcha(); }}>
                    {captcha ? <img src={captcha.image} alt="Security Code" width={140} height={30} /> : <span>{loadingCaptcha ? "Loading…" : "Retry"}</span>}
                  </button>
                </td>
              </tr>
              <tr>
                <td style={{ textAlign: "center" }}>
                  <input type="submit" value={busy ? "Signing in…" : "Login"} disabled={busy || loadingCaptcha || !captcha} />{" "}
                  <input type="button" value="Cancel" onClick={() => navigate({ to: "/" })} />
                </td>
              </tr>
              <tr><th colSpan={3} role={err ? "alert" : undefined} className="lo-login-error">{err}</th></tr>
              <tr><th align="right" style={{ textAlign: "right" }}><Link to="/contact">Forgot Login Password?</Link></th></tr>
            </tbody>
          </table>
          <div className="lo-login-footer">CopyRights©{new Date().getFullYear()} By <br />Life OS Limited</div>
        </form>
      </div>
    </div>
  );
}
