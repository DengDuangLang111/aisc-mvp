import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "StudyLock - AI-Powered Homework Focus Assistant",
  description: "Stay focused, learn better, and track your progress with AI-powered study assistance.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
