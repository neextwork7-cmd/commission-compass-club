import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, type ReactNode } from "react";
import { referralJoinUrl, type JoinTeam } from "@/lib/join-fields";
import { Page, useMember } from "@/components/member-kit";
import { bdt, LEDGER_LABELS } from "@/lib/member-api";

export const Route = createFileRoute("/member/")({
  head: () => ({ meta: [{ title: "Dashboard — Life OS Member" }, { name: "description", content: "Life OS member dashboard." }, { property: "og:title", content: "Dashboard — Life OS Member" }, { property: "og:description", content: "Life OS member dashboard." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }] }),
  component: Dashboard,
});

type Me = { name: string; life_id: string; referral_code: string; phone: string; email: string | null; status: string; created_at: string; referred_by: string | null; total_referral: number };
type Wallet = { withdrawable: number; pending_withdrawal: number; withdrawn: number; cashback_service_only: number; service_balance: number; recharge_pending: number; by_type: Record<string, number> };
type Rank = { lifetime_matchings: number; current: { name?: string } | null };

const Line = () => <tr><td colSpan={2}><hr /></td></tr>;
const Item = ({ k, v, w }: { k: string; v: ReactNode; w?: boolean }) => <tr><td width={w ? "60%" : undefined}>{k}</td><td className="right">{v}</td></tr>;
const Sum = ({ k, v }: { k: string; v: ReactNode }) => <tr><td className="right"><b>{k}</b></td><td className="right">{v}</td></tr>;
const Cur = ({ k, v }: { k: string; v: ReactNode }) => <tr><td><b>{k}</b></td><td className="right"><b>{v}</b></td></tr>;
const Title = ({ t }: { t: string }) => <tr><td colSpan={2} height={20}><h4>{t}</h4></td></tr>;

function Dashboard() {
  const me = useMember<Me>("me", "/me").data;
  const w = useMember<Wallet>("wallet", "/wallet").data;
  const rank = useMember<Rank>("rank", "/rank").data;
  const profile = useMember<{ photo_base64?: string | null }>("profile", "/profile").data;
  if (!me) return null;
  const by = w?.by_type ?? {};
  const totalIn = Object.values(by).reduce((a, b) => a + Number(b), 0);
  const totalOut = Number(w?.withdrawn ?? 0) + Number(w?.pending_withdrawal ?? 0);

  const info: [string, ReactNode][] = [
    ["Account Username", me.life_id],
    ["Account Full Name", me.name],
    ["Email Address", me.email ?? "N/A"],
    ["Cell Number", me.phone],
    ["Joining Date Time", me.created_at],
    ["Account Status", me.status],
    ["Referral Code", me.referral_code],
    ["Refer ID", me.referred_by ?? "N/A"],
    ["Total Referral", me.total_referral],
    ["Lifetime Matchings", rank?.lifetime_matchings ?? 0],
  ];
  const photo = profile?.photo_base64;

  return (
    <Page title="Dashboard">
      <table width="100%" border={0} cellSpacing={0} cellPadding={0}>
        <tbody>
          <tr>
            <td width="48%" valign="top" style={{ padding: "0px 20px" }}>
              <table className="table_wallet" width="100%" border={0} cellSpacing={7} cellPadding={0} style={{ marginBottom: 40 }}>
                <tbody>
                  <Title t="Credit Statement" />
                  {["REFERRAL", "MATCHING", "GENERATION", "RANK", "ADJUSTMENT"].map((t, i) => (
                    <Item key={t} k={`Total ${LEDGER_LABELS[t]}`} v={bdt(by[t])} w={i === 1} />
                  ))}
                  <Line />
                  <Sum k="All Total Amount" v={bdt(totalIn)} />
                  <Sum k="Total Withdrawals Amount" v={`- ${bdt(w?.withdrawn)}`} />
                  <Sum k="Pending Withdrawals" v={`- ${bdt(w?.pending_withdrawal)}`} />
                  <Line />
                  <Cur k="Current Credit Balance" v={bdt(w?.withdrawable)} />
                  <tr><td colSpan={2} height={20}> </td></tr>
                  <Title t="Service Wallet Statement" />
                  <Item k="Cashback Wallet (service use only)" v={bdt(w?.cashback_service_only)} />
                  <Item k="All Total Out Amount" v={bdt(totalOut)} />
                  <Item k="Transferable Balance (Balance Transfer)" v={bdt(w?.service_balance)} />
                  <Item k="Pending Mobile Recharge" v={bdt(w?.recharge_pending)} />
                  <Line />
                  <Cur k="Remaining Current Balance" v={bdt(w?.withdrawable)} />
                </tbody>
              </table>
            </td>
            <td width="6%" valign="top" style={{ padding: "0px 20px" }}> </td>
            <td className="profile_images" valign="top">
              <div className="div_block" style={{ width: 200, textAlign: "center", margin: "0px 80px", padding: 10 }}>
                {photo
                  ? <img src={photo} alt={me.name} style={{ width: 200, height: 200, objectFit: "cover" }} />
                  : <img src="/member-kit/neel/blank.png" alt={me.name} style={{ height: 200 }} />}
              </div>
              <br />
              <table className="profile_images_div" width="100%" border={0} cellSpacing={7} cellPadding={0} style={{ marginLeft: 50 }}>
                <tbody>
                  {info.map(([k, v], i) => (
                    <tr key={k}><td width={i === 0 ? "35%" : undefined}>{k}</td><td width="1%">:</td><td>{v}</td></tr>
                  ))}
                </tbody>
              </table>
              <br />
              <div className="div_block lo-status">
                <h2>ID STATUS</h2>
                <h4>{rank?.current?.name ?? "Member"}</h4>
              </div>
              <br />
              <div className="div_block lo-status">
                <h2>CURRENT BALANCE</h2>
                <h4>{bdt(w?.withdrawable)}</h4>
              </div>
            </td>
          </tr>
          <tr>
            <td colSpan={3} style={{ padding: "20px 0px 0px 0px", textAlign: "center" }}>
              <div className="div_block lo-share">
                <p>
                  <span>Share my direct register affiliate link for my team Affiliations</span>
                  <br /><br />
                  <JoinLink code={me.referral_code} team="L" />
                  <br />
                  <JoinLink code={me.referral_code} team="R" />
                </p>
              </div>
            </td>
          </tr>
          <tr>
            <td colSpan={3} style={{ padding: "20px 0px 0px 0px", textAlign: "center" }}>
              <table className="table" width="100%" border={0} cellSpacing={7} cellPadding={0} style={{ marginBottom: 40 }}>
                <tbody>
                  <tr><th colSpan={2} style={{ textAlign: "center" }}>Message-Box</th></tr>
                  <tr><td colSpan={2} style={{ textAlign: "center", height: 50 }}>Sorry, no message for you right now.</td></tr>
                </tbody>
              </table>
            </td>
          </tr>
        </tbody>
      </table>
    </Page>
  );
}

function JoinLink({ code, team }: { code: string; team: JoinTeam }) {
  const [status, setStatus] = useState("");
  const [url, setUrl] = useState("");
  useEffect(() => { setUrl(referralJoinUrl(window.location.origin, code, team)); }, [code, team]);
  async function copy() {
    try { await navigator.clipboard.writeText(url); setStatus("Copied"); }
    catch { setStatus("Copy unavailable — select the link above."); }
  }
  return (
    <>
      <small>{team === "L" ? "LEFT TEAM" : "RIGHT TEAM"}</small>
      <a target="_blank" rel="noreferrer" href={url || undefined}>{url}</a>
      <button type="button" onClick={copy} disabled={!url}>Copy</button>
      {status && <small role="status">{status}</small>}
    </>
  );
}
