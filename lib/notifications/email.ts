import nodemailer from "nodemailer";

function getRequiredEnv(name: string): string | null {
  const value = process.env[name];
  return value && value.trim() ? value.trim() : null;
}

function createTransport() {
  const host = getRequiredEnv("SMTP_HOST");
  const portRaw = getRequiredEnv("SMTP_PORT");
  const user = getRequiredEnv("SMTP_USER");
  const pass = getRequiredEnv("SMTP_PASS");

  if (!host || !portRaw || !user || !pass) return null;

  const port = Number.parseInt(portRaw, 10);
  if (!Number.isFinite(port) || port <= 0) return null;

  return nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
  });
}

export interface DraftReadyEmailInput {
  to: string[];
  leagueName: string;
  leagueId: string;
  episodeNumber: number;
}

export async function sendDraftReadyEmail(input: DraftReadyEmailInput): Promise<{ sent: boolean; reason?: string }> {
  const from = getRequiredEnv("EMAIL_FROM");
  const appBaseUrl = getRequiredEnv("APP_BASE_URL");
  const transport = createTransport();

  if (!from || !appBaseUrl || !transport) {
    return { sent: false, reason: "Email is not configured (SMTP_* or EMAIL_FROM or APP_BASE_URL missing)" };
  }
  if (!input.to.length) return { sent: false, reason: "No recipients" };

  const adminUrl = `${appBaseUrl}/l/${input.leagueId}/admin`;
  const subject = `Episode ${input.episodeNumber} score draft ready: ${input.leagueName}`;
  const text = [
    `A new score draft is ready for review in ${input.leagueName}.`,
    ``,
    `Episode: ${input.episodeNumber}`,
    `Review and approve: ${adminUrl}`,
  ].join("\n");

  await transport.sendMail({
    from,
    to: input.to.join(", "),
    subject,
    text,
  });

  return { sent: true };
}
