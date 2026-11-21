import type { Metadata, Viewport } from "next";
import { Be_Vietnam_Pro, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const body = Be_Vietnam_Pro({
  variable: "--font-body",
  subsets: ["latin", "vietnamese"],
  weight: ["400", "500", "600", "700", "800"],
});

const code = JetBrains_Mono({
  variable: "--font-code",
  subsets: ["latin", "vietnamese"],
});

export const metadata: Metadata = {
  title: "Request X-Ray · ASP.NET Core",
  description: "Nhìn xuyên qua pipeline của ASP.NET Core: mỗi request được vẽ thành gói tin đi qua 7 chặng.",
};

export const viewport: Viewport = {
  themeColor: "#060a13",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="vi" className={`${body.variable} ${code.variable} h-full antialiased`}>
      <body className="min-h-full font-sans">{children}</body>
    </html>
  );
}
