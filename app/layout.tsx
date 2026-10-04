import type { Metadata } from "next";
import "./globals.css";
import Gate from "./gate";
import DialogHost from "@/components/dialog-host";

export const metadata: Metadata = {
  title: "FleetFlow — Transport, in sync",
  description: "A calmer way to run your transport business.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body><Gate>{children}</Gate><DialogHost/></body></html>;
}
