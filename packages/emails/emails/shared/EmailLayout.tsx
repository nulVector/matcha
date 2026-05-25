import * as React from "react";
import { Body, Container, Head, Html, Preview, Tailwind } from "react-email";
import { emailThemeConfig } from "./emailTheme";

interface EmailLayoutProps {
  previewText: string;
  children: React.ReactNode;
}

export const EmailLayout = ({ previewText, children }: EmailLayoutProps) => {
  return (
    <Html>
      <Head />
      <Preview>{previewText}</Preview>
      <Tailwind config={emailThemeConfig}>
        <Body className="bg-background font-sans antialiased text-foreground">
          <Container className="mx-auto max-w-140">{children}</Container>
        </Body>
      </Tailwind>
    </Html>
  );
};
