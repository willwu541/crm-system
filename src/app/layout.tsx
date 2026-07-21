import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Wiberg Metal CRM | 钢格板客户报价系统",
  description: "Wiberg Metal - 钢格板内外贸客户报价管理系统",
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
