import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Employee Dashboard — StayVista",
  description: "StayVista's org-wide performance scorecard platform",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
