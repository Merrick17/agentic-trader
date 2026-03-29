import type { Metadata } from "next";
import { ThemeProvider } from "next-themes";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/sonner";
import { SolanaWalletProvider } from "@/lib/solana/wallet";
import "./globals.css";

export const metadata: Metadata = {
  title: "MATRIX TRADER v2.0",
  description: "Autonomous crypto trading terminal for Solana. AI-powered market scanning and execution.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="h-full antialiased bg-black text-primary font-mono" suppressHydrationWarning>
          <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false}>
        <SolanaWalletProvider>
        
            <TooltipProvider>
              {children}
              <Toaster />
            </TooltipProvider>
        
        </SolanaWalletProvider>
          </ThemeProvider>
      </body>
    </html>
  );
}
