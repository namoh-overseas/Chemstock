// mail.lib.js

export const mails = {
  otp: ({ otp }) => ({
    subject: "Your OTP Code",
    text: `Your OTP code is: ${otp}. It is valid for 10 minutes.`,
    html: `<p>Your OTP code is: <strong>${otp}</strong></p><p>It is valid for 10 minutes.</p>`,
  }),
  verification: ({ verificationLink }) => ({
    subject: "Verify Your Email",
    text: `Please verify your email by clicking on this link: ${verificationLink}`,
    html: `<p>Please verify your email by clicking <a href="${verificationLink}">here</a>.</p>`,
  }),
  passwordReset: ({ resetLink }) => ({
    subject: "Reset Your Password",
    text: `Click the following link to reset your password: ${resetLink}`,
    html: `<p>Please reset your password by clicking <a href="${resetLink}">here</a>.</p>`,
  }),
  welcome: () => ({
    subject: "Welcome to Our SaaS Platform!",
    text: "Welcome! We're excited to have you on board.",
    html: `<h1>Welcome!</h1><p>We're excited to have you on board.</p>`,
  }),
};
