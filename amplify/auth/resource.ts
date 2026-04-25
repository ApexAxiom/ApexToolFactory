import { defineAuth } from "@aws-amplify/backend";

export const auth = defineAuth({
  groups: ["OWNER", "OFFICE_MANAGER", "ESTIMATOR", "TECHNICIAN", "ACCOUNTING"],
  loginWith: {
    email: true
  },
  multifactor: {
    mode: "REQUIRED",
    totp: true
  },
  userAttributes: {
    email: {
      required: true,
      mutable: true
    }
  }
});
