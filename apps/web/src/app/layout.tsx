import { ThemeToggle } from "@/components/themeToggle";
import AuthProvider from "@/providers/authProvider";
import QueryProvider from "@/providers/queryProvider";
import { ThemeProvider } from "@/providers/themeProvider";
import { TooltipProvider } from "@matcha/ui/components/tooltip";
import "@matcha/ui/globals.css";
import { cn } from "@matcha/ui/lib/utils";
import { Geist, Ubuntu } from "next/font/google";

const ubuntu = Ubuntu({
  variable: "--font-ubuntu-sans",
  subsets: ["latin"],
  weight: ["400", "500", "700"],
});

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={cn(
          "min-h-screen font-sans antialiased selection:bg-primary selection:text-primary-foreground",
          ubuntu.variable,
          geistSans.variable,
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
