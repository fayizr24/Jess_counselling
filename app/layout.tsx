import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Jess Counselling | Online Counselling Services",
  description: "Jess Counselling offers compassionate online counselling in Malayalam and English for relationship concerns, parenting, stress and emotional wellbeing.",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head><link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Lora:ital,wght@1,500;1,700&display=swap"/></head>
      <body className="antialiased">{children}</body>
    </html>
  );
}
