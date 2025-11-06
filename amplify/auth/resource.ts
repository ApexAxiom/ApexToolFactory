import { defineAuth } from '@aws-amplify/backend';

export const auth = defineAuth({
  loginWith: {
    email: true,
    username: true
  },
  multifactor: {
    mode: 'OFF'
  },
  userAttributes: {
    email: {
      required: false,
      mutable: true
    },
    name: {
      required: false,
      mutable: true
    }
  }
});
