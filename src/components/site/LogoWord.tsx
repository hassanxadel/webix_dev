/** A word lettered like the Webix logo (`.logo-type` in styles.css); `ix` = the logo's yellow "ix" colours. */
export function LogoWord({ w, variant }: { w: string; variant?: "ix" }) {
  return (
    <span className={variant ? `logo-type logo-type-${variant}` : "logo-type"} data-text={w}>
      {w}
    </span>
  );
}
