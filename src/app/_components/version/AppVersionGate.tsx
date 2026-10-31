"use client";

import React, { useEffect, useState } from "react";
import { checkAppVersion, type VersionCheckResult } from "@/lib/version-checker";
import { AppUpdateRequiredModal } from "./AppUpdateRequiredModal";

export function AppVersionGate({ children }: { children: React.ReactNode }) {
  const [versionState, setVersionState] = useState<VersionCheckResult | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function runCheck() {
      const res = await checkAppVersion();
      if (isMounted) {
        setVersionState(res);
      }
    }

    void runCheck();

    // Re-check when app regains focus or visibility
    const handleVisibility = () => {
      if (document.visibilityState === "visible") {
        void runCheck();
      }
    };

    document.addEventListener("visibilitychange", handleVisibility);
    return () => {
      isMounted = false;
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, []);

  if (versionState?.isOutdated && versionState.policy) {
    return (
      <>
        <AppUpdateRequiredModal
          installedVersionName={versionState.installedVersionName}
          installedVersionCode={versionState.installedVersionCode}
          policy={versionState.policy}
        />
        {/* Render inert backdrop to satisfy DOM structure while completely blocking interaction */}
        <div aria-hidden="true" className="pointer-events-none select-none opacity-0">
          {children}
        </div>
      </>
    );
  }

  return <>{children}</>;
}
