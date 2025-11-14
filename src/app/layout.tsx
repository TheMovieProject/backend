import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Provider from "@/app/context/AuthContext";
import ToastContext from "@/app/context/ToastContext";
import Navbar from "@/app/components/NavbarServer/NavbarServer";
import Footer from "@/app/components/Footer/footer";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "TheMOVIEPROJECT",   
  description: "Discover, review, and share movies with Movie Project.",
  icons: {
    icon: "/favicon.ico",     
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <Provider>
          <Navbar />
          <ToastContext />
          {children}
          <Footer />
        </Provider>
      </body>
    </html> 
  );
}
