import * as React from "react";
import {
  Html,
  Head,
  Body,
  Container,
  Text,
  Button,
} from "@react-email/components";

export const ResetPasswordEmail = ({ resetLink }: { resetLink: string }) => (
  <Html>
    <Head />
    <Body style={{ fontFamily: "Arial" }}>
      <Container>
        <Text>Hello,</Text>
        <Text>
          You recently requested to reset your password. Click the button below
          to proceed:
        </Text>
        <Button
          href={resetLink}
          style={{ backgroundColor: "#000", color: "#fff", padding: "10px" }}
        >
          Reset Password
        </Button>
      </Container>
    </Body>
  </Html>
);
