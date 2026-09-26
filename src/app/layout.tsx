import type { Metadata } from "next";
import "./globals.css";
import { UserProvider } from "@/lib/UserContext";
import Navbar from "@/components/Navbar";

export const metadata: Metadata = {
  title: "Ultimate Casino",
  description: "A feature-packed browser casino — slots, blackjack, roulette, poker, crash and more.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col">
        <UserProvider>
          <Navbar />
          <main className="flex-1 mx-auto w-full max-w-7xl px-4 py-6">{children}</main>
        </UserProvider>
      </body>
    </html>
  );
}
