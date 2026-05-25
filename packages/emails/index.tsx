import { render } from "@react-email/render";
import {
  PasswordResetEmail,
  PasswordResetEmailProps,
} from "./emails/PasswordReset";

export const renderPasswordResetEmail = async (
  props: PasswordResetEmailProps,
) => {
  return await render(<PasswordResetEmail {...props} />);
};
