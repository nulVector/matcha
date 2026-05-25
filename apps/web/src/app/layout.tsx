import { ThemeProvider } from "@/providers/themeProvider";
import AuthProvider from "@/providers/authProvider";
import QueryProvider from "@/providers/queryProvider";
import { TooltipProvider } from "@matcha/ui/components/tooltip";
import "@matcha/ui/globals.css";
import { cn } from "@matcha/ui/lib/utils";
import { ThemeToggle } from "@/components/themeToggle";
import { Inter, Geist_Mono } from "next/font/google";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={cn(
          "min-h-screen font-sans antialiased",
          inter.variable, 
          geistMono.variable,
        )}
      >
        <ThemeProvider>
          <TooltipProvider>
            <ThemeToggle />
            <QueryProvider>
              <AuthProvider>{children}</AuthProvider>
            </QueryProvider>
          </TooltipProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
