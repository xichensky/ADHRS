import type { Metadata } from "next";
import "./globals.css";
import { Sidebar } from "@/components/sidebar";

export const metadata: Metadata = {
  title: "vibeHR — HRS",
  description: "Human Resource System (adhrs) reproduction",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className="h-full">
      <body className="min-h-full">
        <div className="flex min-h-screen">
          <Sidebar />
          <main className="flex min-h-screen flex-1 flex-col overflow-x-hidden">
            <div className="flex-1 px-8 py-8">{children}</div>
          </main>
        </div>
      </body>
    </html>
  );
}
