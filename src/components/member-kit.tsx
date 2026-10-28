import { Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { memberApi, memberToken } from "@/lib/member-api";

/** Menu mirrors the reference kit's ddsmoothmenu structure, limited to Life OS plan pages. */
const MENU: { label: string; items: { to: string; label: string }[] }[] = [
  {
    label: "Account State",
    items: [
      { to: "/member", label: "Dashboard" },
      { to: "/member/commission", label: "Bonus Report" },
      { to: "/member/notice", label: "Account Notice" },
      { to: "/member/profile", label: "Profile View/Edit" },
      { to: "/member/change-password", label: "Password Change/Reset" },
    ],
  },
  {
    label: "Sales View",
    items: [
      { to: "/member/tree", label: "Binary Tree" },
      { to: "/member/enrollment", label: "Enrollment" },
      { to: "/member/sponsors", label: "Sponsors List" },
      { to: "/member/statistics", label: "Statistics View" },
      { to: "/member/activation", label: "Package Activation" },
    ],
  },
  {
    label: "Matching",
    items: [
      { to: "/member/matching-binary", label: "Matching Binary" },
      { to: "/member/matching-placement", label: "Matching Enrollment" },
    ],
  },
  {
    label: "Withdrawals",
    items: [
      { to: "/member/withdrawals", label: "Withdrawals Form" },
      { to: "/member/withdrawals-report", label: "Withdrawals Reports" },
    ],
  },
  {
    label: "Transaction",
    items: [
      { to: "/member/transaction", label: "Balance Transfer" },
      { to: "/member/transaction-report", label: "Transfer Reports" },
      { to: "/member/receive-report", label: "Receive Reports" },
      { to: "/member/transaction-pin", label: "Transaction Password" },
    ],
  },
  {
    label: "Mobile Recharge",
    items: [
      { to: "/member/recharge", label: "Recharge Form" },
      { to: "/member/recharge-report", label: "Recharge Reports" },
    ],
  },
];

/** Reference print button: prints the first report table of the page, like the source kit. */
function printReports() {
  const table = document.querySelector<HTMLTableElement>("#main_member table.table");
  const w = window.open("", "print", "height=600,width=900");
  if (!w) return;
  const body = table ? table.outerHTML : document.getElementById("main_member")?.innerHTML ?? "";
  w.document.write(
    '<html><head><title>Life OS</title><style>body{font-family:Tahoma;font-size:12px}.table th{background-color:#083E88;padding:5px 2px;color:#FFFFFF}.table{border:6px solid #083E88;border-top:0;border-collapse:collapse}.table td{border:1px solid #083E88;padding:5px}</style></head><body><div>' +
      body +
      "</div></body></html>",
  );
  w.document.close();
  w.focus();
  w.print();
}

/** Whole-canvas scale: exactly 1:1 with the 1000px reference at a 1280px viewport, same proportions elsewhere. */
export function useCanvasScale() {
  const ref = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new ResizeObserver(([entry]) => {
      if (!entry) return;
      const vw = entry.contentRect.width;
      setScale(vw < 1280 ? Math.min(1, vw / 1010) : (vw * 0.78125) / 1000);
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  return { ref, scale };
}

export function useMember<T>(key: string, path: string, enabled = true) {
  return useQuery({ queryKey: ["member", key], queryFn: () => memberApi<T>(path), enabled, retry: false });
}

export function MemberShell({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);
  const [open, setOpen] = useState<number | null>(null);
  const { ref, scale } = useCanvasScale();

  useEffect(() => {
    if (!memberToken.get()) navigate({ to: "/login" });
    else setReady(true);
  }, [navigate]);

  const me = useMember<{ name: string; life_id?: string }>("me", "/me", ready);
  useEffect(() => {
    if (me.error) navigate({ to: "/login" });
  }, [me.error, navigate]);

  const logout = () => {
    memberToken.clear();
    navigate({ to: "/login" });
  };

  return (
    <div ref={ref} className="lifeos-member-viewport neel-viewport">
      <div id="wrapper" className="lifeos-member neel" style={{ zoom: scale }}>
        <div className="mid_image">
          <div id="header">
            <div className="logo">
              <Link to="/member" aria-label="Life OS member dashboard">
                <img src="/member-kit/neel/banner.png" alt="Life OS" />
              </Link>
            </div>
          </div>
          <nav id="menu" className="ddsmoothmenu">
            <ul>
              {MENU.map((m, i) => (
                <li key={m.label} style={{ zIndex: 100 - i }} onMouseEnter={() => setOpen(i)} onMouseLeave={() => setOpen(null)}>
                  <a href="#" className={open === i ? "selected" : undefined} onClick={(e) => { e.preventDefault(); setOpen(open === i ? null : i); }}>{m.label}</a>
                  <ul style={{ display: open === i ? "block" : "none" }}>
                    {m.items.map((it) => (
                      <li key={it.to}><Link to={it.to} onClick={() => setOpen(null)}>{it.label}</Link></li>
                    ))}
                    <span />
                  </ul>
                </li>
              ))}
              <li><a href="#" onClick={(e) => { e.preventDefault(); logout(); }}>Logout</a></li>
            </ul>
            <br />
          </nav>
          <div id="main_member">
            <div>{ready && me.data ? children : <div className="main_bg about"><h2 id="heading">Loading…</h2></div>}</div>
            <br className="cleaner" />
            <div className="print"><img src="/member-kit/neel/printer.png" alt="Print" title="Print Only Reports" onClick={() => printReports()} /></div>
          </div>
          {me.data && <div className="my-userid">My User ID: {me.data.life_id ?? ""}</div>}
        </div>
        <div className="fotter"><div>CopyRights©{new Date().getFullYear()} By Life OS Limited</div></div>
      </div>
    </div>
  );
}

export function Page({ title, children, center }: { title: string; children: ReactNode; center?: boolean }) {
  return (
    <div className="main_bg about" style={center ? { textAlign: "center" } : undefined}>
      <h2 id="heading" style={center ? { textAlign: "left" } : undefined}>{title}</h2>
      {children}
    </div>
  );
}

/** Reference report table: `.table` with 6px frame, blue head/foot, "No record found." error row. */
export function DataTable({ head, rows, empty = "No record found.", foot, footSpan = 1, caption, style }: { head: string[]; rows: ReactNode[][]; empty?: string; foot?: ReactNode[] | undefined; footSpan?: number; caption?: ReactNode; style?: React.CSSProperties }) {
  return (
    <table className="table" width="100%" cellSpacing={5} cellPadding={0} style={style}>
      {caption && <caption>{caption}</caption>}
      <thead>
        <tr>{head.map((h, i) => <th key={i}>{h}</th>)}</tr>
      </thead>
      <tbody>
        {rows.length === 0 ? (
          <tr><td colSpan={10} className="error">{empty}</td></tr>
        ) : (
          rows.map((r, i) => <tr key={i}>{r.map((c, j) => <td key={j}>{c}</td>)}</tr>)
        )}
      </tbody>
      {foot && <tfoot><tr>{foot.map((c, j) => <th key={j} colSpan={j === 0 ? footSpan : undefined}>{c}</th>)}</tr></tfoot>}
    </table>
  );
}

/** Reference "Date From / Date To / Search" bar used above report tables. */
export function DateFilter({ onApply, children }: { onApply: (v: { from: string; to: string }) => void; children?: ReactNode }) {
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  return (
    <form style={{ margin: "10px 0", textAlign: "center" }} onSubmit={(e) => { e.preventDefault(); onApply({ from, to }); }}>
      <b>Date From:</b> <input type="text" placeholder="YYYY-MM-DD" aria-label="Date from" value={from} onChange={(e) => setFrom(e.target.value)} style={{ width: 100 }} />{" "}
      <b style={{ marginLeft: 20 }}>Date To:</b> <input type="text" placeholder="YYYY-MM-DD" aria-label="Date to" value={to} onChange={(e) => setTo(e.target.value)} style={{ width: 100 }} />{" "}
      {children}
      <input type="submit" value="Search" style={{ marginLeft: 20 }} />
    </form>
  );
}

export const inRange = (created: string, r: { from: string; to: string }) => {
  const d = created.slice(0, 10);
  return (!r.from || d >= r.from) && (!r.to || d <= r.to);
};

export function Msg({ ok, text }: { ok?: boolean | undefined; text: string | null }) {
  if (!text) return null;
  return <div id="message" className={ok ? "success" : "error"} style={{ margin: "10px 0" }}>{text}</div>;
}

/** Reference form row: `label : control` inside a cellspacing table. */
export function Row({ label, children, req, w }: { label?: ReactNode; children?: ReactNode; req?: boolean; w?: string }) {
  return (
    <tr>
      <td width={w}>{label}{req && <> <sup>*</sup></>}</td>
      <td width={w ? "2%" : undefined}>:</td>
      <td>{children}</td>
    </tr>
  );
}

export const fmtDate = (s?: string | null) => (s ? new Date(s.replace(" ", "T")).toLocaleString("en-GB", { day: "2-digit", month: "long", year: "numeric", hour: "numeric", minute: "2-digit" }) : "");
/** Compact "YYYY-MM-DD HH:mm" for dense report tables (matches the reference admin kit). */
export const fmtDateShort = (s?: string | null) => {
  if (!s) return "";
  const d = new Date(s.replace(" ", "T"));
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
};
