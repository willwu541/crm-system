import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "客户报价系统",
  description: "客户报价系统 - 商机、订单、外放询价管理",
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
