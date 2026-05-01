import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "보험증권 뷰어",
  description: "보험증권 PDF 뷰어",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
