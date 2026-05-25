import { Button, Column, Heading, Img, Row, Section, Text } from "react-email";
import { EmailLayout } from "./shared/EmailLayout";

export interface PasswordResetEmailProps {
  resetUrl: string;
  expiresIn?: string;
}

export const PasswordResetEmail = ({
  resetUrl,
  expiresIn = "10 minutes",
}: PasswordResetEmailProps) => (
  <EmailLayout previewText="Reset your Matcha password">
    <Section className="bg-card px-8 py-8 mt-8 rounded-lg border border-border">
      <Row className="pb-8">
        <Column className="w-15">
          <Img
            src="https://framerusercontent.com/images/dQ0BWHK6l97rmArVbZ7pTKA9fw.png?width=200&height=200"
            width="50"
            height="50"
            alt="Matcha Logo"
          />
        </Column>
        <Column>
          <Text className="text-4xl leading-8 m-0 font-bold tracking-tight text-primary">
            Matcha
          </Text>
        </Column>
      </Row>

      <Heading className="text-2xl font-bold mt-0 mb-4 text-cardForeground">
        Reset your password
      </Heading>

      <Text className="text-[15px] leading-6 mb-6 text-foreground">
        We received a request to reset your Matcha password. Click the button
        below to set a new one:
      </Text>

      <Section className="mb-6">
        <Button
          className="bg-primary rounded-md text-primaryForeground text-[15px] font-semibold text-center inline-block px-6 py-3"
          href={resetUrl}
        >
          Reset Password
        </Button>
      </Section>

      <Text className="text-[15px] leading-6 m-0 text-foreground">
        This link expires in <strong>{expiresIn}</strong>.
        <br />
        If you didn't request this, you can safely ignore this email.
      </Text>
    </Section>

    <Text className="text-mutedForeground text-[12px] leading-4 text-center mt-6 px-4">
      © {new Date().getFullYear()} Matcha Inc. All rights reserved.
    </Text>
  </EmailLayout>
);

export default PasswordResetEmail;
