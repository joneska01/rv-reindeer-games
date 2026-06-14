import type { Metadata } from "next";
import { Cinzel, Lora, DM_Mono } from "next/font/google";
import "./globals.css";

const cinzel = Cinzel({
  variable: "--font-cinzel",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

const lora = Lora({
  variable: "--font-lora",
  subsets: ["latin"],
});

const dmMono = DM_Mono({
  variable: "--font-dm-mono",
  subsets: ["latin"],
  weight: ["400", "500"],
});

const appName = process.env.NEXT_PUBLIC_APP_NAME ?? "RV Reindeer Games";

export const metadata: Metadata = {
  title: appName,
  description:
    "Live scoreboard for the RV Reindeer Games — the annual holiday party where couples compete for gilded bragging rights.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${cinzel.variable} ${lora.variable} ${dmMono.variable} h-full antialiased`}
    >
      <body className="relative min-h-full">
        <div className="relative z-10 flex min-h-dvh flex-col">{children}</div>
      </body>
    </html>
  );
}
