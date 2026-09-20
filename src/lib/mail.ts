import "server-only";
import nodemailer from "nodemailer";
import { PARK } from "./park";

/**
 * Transactional email over SMTP (a Gmail app password is enough for the
 * demo). If SMTP is not configured, sending is skipped and logged, so the
 * adoption flow never depends on it.
 */
const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, MAIL_FROM, ADMIN_EMAIL } = process.env;
export const mailConfigured = Boolean(SMTP_HOST && SMTP_USER && SMTP_PASS);

const transport = mailConfigured
  ? nodemailer.createTransport({ host: SMTP_HOST, port: Number(SMTP_PORT ?? 465), secure: Number(SMTP_PORT ?? 465) === 465, auth: { user: SMTP_USER, pass: SMTP_PASS } })
  : null;

async function send(to: string, subject: string, text: string) {
  if (!transport) {
    console.log(`[mail skipped: SMTP not configured] to=${to} subject=${subject}`);
    return;
  }
  try {
    await transport.sendMail({ from: MAIL_FROM ?? SMTP_USER, to, subject, text });
  } catch (err) {
    console.error("[mail] failed", err);
  }
}

type Req = { donor_name: string; donor_email: string; bench_id: string; side: string; plaque_text: string; amount_usd: number; install: boolean };

const plaqueName = (side: string) => (side === "A" ? "left plaque" : "right plaque");

export async function mailRequestReceived(r: Req, benchUrl: string) {
  const first = r.donor_name.split(" ")[0];
  await send(
    r.donor_email,
    `We received your bench adoption request (${r.bench_id})`,
    `Hi ${first},

Thank you for adopting a bench in ${PARK.name}. We received your request for the ${plaqueName(r.side)} of bench ${r.bench_id}.

Your plaque text:
${r.plaque_text}

Gift: $${r.amount_usd.toLocaleString("en-US")}${r.install ? " (new bench installation)" : ""}

What happens next: park staff review the request and confirm your gift. The plaque is held for you meanwhile. Once approved, ${r.install ? "we schedule the installation (about 3 months)" : "the plaque is made and installed in about 6–8 weeks"}. We will email you at each step.

You can see your bench here: ${benchUrl}

${PARK.name} Alliance`,
  );
  if (ADMIN_EMAIL) {
    await send(
      ADMIN_EMAIL,
      `New adoption request: ${r.bench_id} ${plaqueName(r.side)} from ${r.donor_name}`,
      `${r.donor_name} <${r.donor_email}> requested the ${plaqueName(r.side)} of ${r.bench_id} ($${r.amount_usd}).

Plaque text:
${r.plaque_text}

Review it in the staff queue.`,
    );
  }
}

export async function mailReviewed(r: Req & { approved: boolean }, benchUrl: string) {
  const first = r.donor_name.split(" ")[0];
  await send(
    r.donor_email,
    r.approved ? `Your bench adoption is approved (${r.bench_id})` : `About your bench adoption request (${r.bench_id})`,
    r.approved
      ? `Hi ${first},

Good news: your adoption of the ${plaqueName(r.side)} of bench ${r.bench_id} in ${PARK.name} is approved. Your ten-year term starts today.

${r.install ? "We will be in touch to schedule the installation of the new bench (about 3 months)." : "Your plaque goes into production now and is installed in about 6–8 weeks."}

Your bench: ${benchUrl}

Thank you for supporting the park.
${PARK.name} Alliance`
      : `Hi ${first},

We could not approve your request for the ${plaqueName(r.side)} of bench ${r.bench_id}, and the plaque is open again. This usually means the plaque text needs a change or the gift could not be confirmed. Reply to this email and we will sort it out together.

${PARK.name} Alliance`,
  );
}
