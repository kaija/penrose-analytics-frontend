import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Prism CDP + Analytics",
  description: "Customer Data Platform and Analytics",
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
