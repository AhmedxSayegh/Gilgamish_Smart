import { useState } from "react";
import { Icon } from "./UI";

export function AirlineLogo({ offer }) {
  const code = String(offer.airlineCode || "").trim().toUpperCase();
  const [failedCode, setFailedCode] = useState(null);
  return (
    <span className="airline-logo" aria-hidden="true">
      {/^[A-Z0-9]{2}$/.test(code) && failedCode !== code ? (
        <img src={`/images/airlines/${code}.png`} alt="" width="48" height="48" loading="lazy" onError={() => setFailedCode(code)} />
      ) : <Icon name="book" />}
    </span>
  );
}
