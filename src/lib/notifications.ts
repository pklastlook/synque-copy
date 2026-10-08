/**
 * Notification helper — single entry point for creating in-app notifications
 * and (optionally) emailing them to the user.
 *
 * Best-effort: failures are logged but never thrown — a notification
 * creation failure MUST NOT break the user-facing request that triggered it
 * (e.g. posting a reply, generating an invoice, recording a payment).
 *
 * Usage:
 *   import { createNotification } from "@/lib/notifications";
 *   await createNotification({
 *     userId: account.ownerId,
 *     type: "comment_received",
 *     title: "New reply sent",
 *     message: `New reply sent to @${comment.author}`,
 *     actionView: "inbox",
 *     actionId: comment.id,
 *   });
 *
 * For events that should also email the user (e.g. payment received), pass
 * `sendEmail: true`. The helper looks up the user's email from the DB and
 * calls sendEmail() — if no mail server is configured, the email is
 * silently skipped (the in-app notification still lands).
 */

import { db } from "@/lib/db";
import { sendEmail } from "@/lib/email";

/** Canonical notification type strings. */
export const NOTIFICATION_TYPES = [
  "comment_received",
  "trial_expiring",
  "payment_received",
  "team_invite",
  "post_published",
  "post_failed",
  "approval_requested",
] as const;

export type NotificationType = (typeof NOTIFICATION_TYPES)[number];

export interface CreateNotificationOpts {
  /** Recipient user ID. */
  userId: string;
  /** One of NOTIFICATION_TYPES. */
  type: string;
  /** Short headline (≤120 chars). */
  title: string;
  /** Body text — what happened, in plain language. */
  message: string;
  /**
   * ViewId the bell should navigate to when the notification is clicked
   * (e.g. "inbox", "owner", "composer"). Optional — some notifications
   * (e.g. "Welcome to SYNQUE!") have no destination.
   */
  actionView?: string | null;
  /** ID of the related entity (post ID, invoice ID, etc.). */
  actionId?: string | null;
  /**
   * If true, ALSO send an email to the user. The email body is built from
   * `title` + `message`. Best-effort — if no mail server is configured,
   * this is silently skipped.
   */
  sendEmail?: boolean;
}

/**
 * Create an in-app Notification row + (optionally) email the user.
 *
 * Safe to call from any API route — never throws.
 */
export async function createNotification(
  opts: CreateNotificationOpts
): Promise<{ id: string | null; emailed: boolean }> {
  // Defensive — bad input shouldn't crash the caller.
  if (!opts.userId || !opts.type || !opts.title || !opts.message) {
    console.warn("[createNotification] missing required field:", {
      userId: !!opts.userId,
      type: !!opts.type,
      title: !!opts.title,
      message: !!opts.message,
    });
    return { id: null, emailed: false };
  }

  let notificationId: string | null = null;
  try {
    const created = await db.notification.create({
      data: {
        userId: opts.userId,
        type: opts.type,
        title: opts.title.slice(0, 200),
        message: opts.message.slice(0, 2000),
        actionView: opts.actionView ?? null,
        actionId: opts.actionId ?? null,
      },
      select: { id: true },
    });
    notificationId = created.id;
  } catch (e) {
    console.error(
      "[createNotification] DB write failed:",
      opts.type,
      e instanceof Error ? e.message : String(e)
    );
    return { id: null, emailed: false };
  }

  let emailed = false;
  if (opts.sendEmail) {
    try {
      const user = await db.user.findUnique({
        where: { id: opts.userId },
        select: { email: true, name: true },
      });
      if (user?.email) {
        const result = await sendEmail({
          to: user.email,
          subject: opts.title,
          text: `Hi ${user.name ?? "there"},\n\n${opts.message}\n\n— SYNQUE`,
        });
        emailed = result.sent;
      }
    } catch (e) {
      // Email is best-effort — log and move on. The in-app notification
      // already landed, which is the important part.
      console.error(
        "[createNotification] email send failed:",
        opts.type,
        e instanceof Error ? e.message : String(e)
      );
    }
  }

  return { id: notificationId, emailed };
}

/**
 * Convenience wrapper for "trial expiring in N days" notifications.
 * Idempotent-ish: skips creation if a `trial_expiring` notification for
 * the same user was created within the last 24h (so a polling scheduler
 * doesn't spam the user).
 */
export async function createTrialExpiringNotification(
  userId: string,
  daysLeft: number
): Promise<void> {
  try {
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const recent = await db.notification.findFirst({
      where: {
        userId,
        type: "trial_expiring",
        createdAt: { gte: oneDayAgo },
      },
      select: { id: true },
    });
    if (recent) return; // Already notified in the last 24h.

    await createNotification({
      userId,
      type: "trial_expiring",
      title: `Your trial expires in ${daysLeft} day${daysLeft === 1 ? "" : "s"}`,
      message:
        daysLeft <= 1
          ? "Your SYNQUE trial ends tomorrow. Add a payment method to keep your workspace live."
          : `Your SYNQUE trial expires in ${daysLeft} days. Add a payment method to keep your workspace live.`,
      actionView: "settings",
      actionId: null,
      sendEmail: true,
    });
  } catch (e) {
    console.error(
      "[createTrialExpiringNotification] failed:",
      e instanceof Error ? e.message : String(e)
    );
  }
}
