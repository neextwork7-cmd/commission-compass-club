import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { useCanvasScale } from "@/components/member-kit";

export const NEEL_LINKS = [
  { rel: "stylesheet", href: "/member-kit/neel.css" },
];

/** Public (signed-out) pages in the member-panel look: same banner, blue menu bar, footer and whole-canvas scaling. */
export function NeelFrame({ children, nav }: { children: ReactNode; nav?: ReactNode }) {
  const { ref, scale } = useCanvasScale();
  return (
    <div ref={ref} className="neel-viewport">
      <div id="wrapper" className="lifeos-member neel" style={{ zoom: scale }}>
        <div className="mid_image">
          <div id="header">
            <div className="logo">
              <Link to="/" aria-label="Life OS home"><img src="/member-kit/neel/banner.png" alt="Life OS" /></Link>
            </div>
          </div>
          <nav id="menu" className="ddsmoothmenu">
            <ul>
              <li><Link to="/">Home</Link></li>
              <li><Link to="/login">Member Login</Link></li>
              {nav}
            </ul>
            <br />
          </nav>
          <div id="main_member">
            <div>{children}</div>
            <br className="cleaner" />
          </div>
        </div>
        <div className="fotter"><div>CopyRights©{new Date().getFullYear()} By Life OS Limited</div></div>
      </div>
    </div>
  );
}
