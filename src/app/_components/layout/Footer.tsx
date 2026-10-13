"use client";

import Link from "next/link";

export function Footer() {
  return (
    <footer className="w-full py-6 mt-12 border-t border-border bg-background">
      <div className="container mx-auto px-4">
        <div className="flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="text-sm text-muted-foreground">
            &copy; {new Date().getFullYear()} Virat Bio Plaantec private limited. All rights reserved.
          </div>
          <div className="flex gap-4 text-sm text-muted-foreground">
            <Link href="/privacy-policy" className="hover:underline focus:ring-2 focus:ring-ring focus:outline-none rounded">
              Privacy Policy
            </Link>
            <Link href="/terms-of-service" className="hover:underline focus:ring-2 focus:ring-ring focus:outline-none rounded">
              Terms of Service
            </Link>
            <Link href="/cookie-policy" className="hover:underline focus:ring-2 focus:ring-ring focus:outline-none rounded">
              Cookie Policy
            </Link>
            <Link href="/data-deletion" className="hover:underline focus:ring-2 focus:ring-ring focus:outline-none rounded">
              Data Deletion
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
