"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export function CookieBanner() {
  const [showBanner, setShowBanner] = useState(false);

  useEffect(() => {
    const consent = localStorage.getItem("cookieConsent");
    if (!consent) {
      setShowBanner(true);
    }
  }, []);

  const acceptCookies = () => {
    localStorage.setItem("cookieConsent", "true");
    setShowBanner(false);
  };

  if (!showBanner) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 p-4 bg-background border-t border-border shadow-lg z-50">
      <div className="container mx-auto flex flex-col sm:flex-row justify-between items-center gap-4">
        <div className="text-sm">
          We use cookies to improve your experience on our CRM. By continuing to use our site, you agree to our{" "}
          <Link href="/cookie-policy" className="underline font-medium hover:text-primary focus:ring-2 focus:ring-ring focus:outline-none rounded">
            Cookie Policy
          </Link>
          .
        </div>
        <div className="flex gap-2">
          <Button onClick={acceptCookies}>Accept</Button>
        </div>
      </div>
    </div>
  );
}
