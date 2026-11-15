"use node";

import nodemailer from "nodemailer";
import { v } from "convex/values";
import { internalAction } from "./_generated/server";

// Sends the .edu code. Gmail SMTP (GMAIL_USER + GMAIL_APP_PASSWORD) reaches any inbox with no domain setup;
// otherwise Resend, which only reaches any inbox once RESEND_FROM uses a domain verified in Resend.
export const sendCode = internalAction({
  args: { to: v.string(), code: v.string() },
  returns: v.null(),
  handler: async (_ctx, { to, code }) => {
    const subject = `Your REAL student code: ${code}`;
    const text = `Your REAL verification code is ${code}. It expires in 10 minutes. If you didn't ask for it, ignore this email.`;
    const gmailUser = process.env.GMAIL_USER;
    const gmailPass = process.env.GMAIL_APP_PASSWORD;
    if (gmailUser && gmailPass) {
      const transport = nodemailer.createTransport({ service: "gmail", auth: { user: gmailUser, pass: gmailPass.replace(/\s/g, "") } });
      await transport.sendMail({ from: `REAL <${gmailUser}>`, to, subject, text });
      return null;
    }
    const key = process.env.RESEND_API_KEY;
    if (!key) throw new Error("Set GMAIL_USER + GMAIL_APP_PASSWORD or RESEND_API_KEY in Convex env");
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from: process.env.RESEND_FROM ?? "REAL <onboarding@resend.dev>", to: [to], subject, text }),
    });
    if (!res.ok) throw new Error(`Resend failed: ${res.status} ${await res.text()}`);
    return null;
  },
});
