import type { Metadata } from "next";
import { DM_Sans } from "next/font/google";
import "./globals.css";

const dmSans = DM_Sans({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800"],
  variable: "--font-dm-sans",
});

export const metadata: Metadata = {
  title: "EduBattle — India's Competitive Learning Platform",
  description: "India's Competitive Learning Ecosystem for K-12",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${dmSans.variable} h-full`}>
      <body className="font-sans bg-[#F0F4FA] min-h-screen h-full">
        {children}
      </body>
    </html>
  );
}
