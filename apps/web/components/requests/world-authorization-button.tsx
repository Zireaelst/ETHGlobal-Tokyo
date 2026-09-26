"use client";

import type { ActionAuthorizationPayload } from "@coffer/shared-types";
import { useState } from "react";
import { beginWorldAuthorization } from "../../lib/world/client";
import { ActionGate } from "../connection/action-gate";
import styles from "./authorization.module.css";

type WorldAuthorizationButtonProps = {
  action: ActionAuthorizationPayload;
  navigate?: (url: string) => void;
};

export function WorldAuthorizationButton({ action, navigate }: WorldAuthorizationButtonProps) {
  const [error, setError] = useState<string | null>(null);

  async function begin() {
    setError(null);
    try {
      const response = await beginWorldAuthorization(action);
      (navigate ?? ((url: string) => window.location.assign(url)))(response.authorizationUrl);
    } catch {
      setError("Authorization could not be started. Confirm the World gateway configuration.");
    }
  }

  return (
    <div className={styles.authorizationAction}>
      <ActionGate actionLabel="Authorize with World" onConnectedAction={begin} />
      {error ? <p role="alert">{error}</p> : null}
    </div>
  );
}
