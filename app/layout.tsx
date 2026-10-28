import type { Metadata } from "next";
import "./globals.scss";

export const metadata: Metadata = {
  title: "Taskflow — Make space for focused work",
  description: "Plan your projects and keep your team's work moving.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
