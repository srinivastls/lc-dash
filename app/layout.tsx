import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "LeetCode Interview Tracker",
  description: "A personal dashboard for LeetCode interview preparation."
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
