import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth-guard";

export const dynamic = "force-dynamic";

/**
 * GET /api/reports/[id]/pdf
 *
 * Generates a real PDF report using jsPDF. Includes:
 * - Report title + description
 * - Date range
 * - Summary metrics table
 * - Per-account breakdown
 *
 * Returns the PDF as a downloadable file.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { user, error } = await requireAuth(req);
  if (error) return error;

  const { id } = await params;

  const report = await db.report.findUnique({ where: { id } });
  if (!report) {
    return NextResponse.json({ error: "Report not found" }, { status: 404 });
  }

  // Parse report config
  const config = JSON.parse(report.config);
  const metrics = config.metrics ?? ["followers", "impressions", "engagement", "reach"];
  const dateRange = config.dateRange ?? "30";

  // Fetch real data
  const [accounts, analytics, variants] = await Promise.all([
    db.account.findMany({ include: { owner: true } }),
    db.analyticsDaily.findMany({
      where: { date: { gte: new Date(Date.now() - parseInt(dateRange) * 86400000) } },
      orderBy: { date: "asc" },
    }),
    db.postVariant.findMany(),
  ]);

  // Generate PDF
  const { jsPDF } = await import("jspdf");
  const autoTable = (await import("jspdf-autotable")).default;

  const doc = new jsPDF();

  // Title
  doc.setFontSize(20);
  doc.setTextColor(40);
  doc.text(report.name, 14, 22);

  // Subtitle
  doc.setFontSize(10);
  doc.setTextColor(100);
  doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 30);
  doc.text(`Date range: Last ${dateRange} days`, 14, 36);
  if (report.description) {
    doc.text(report.description, 14, 42);
  }

  // Summary metrics
  const totalFollowers = accounts.reduce((s, a) => s + a.followers, 0);
  const totalImpressions = analytics.reduce((s, a) => s + a.impressions, 0);
  const totalReach = analytics.reduce((s, a) => s + a.reach, 0);
  const totalEngagement = variants.reduce((s, v) => s + v.likes + v.comments + v.shares + v.saves, 0);

  // Summary table
  autoTable(doc, {
    startY: 50,
    head: [["Metric", "Value"]],
    body: [
      ["Total Followers", totalFollowers.toLocaleString()],
      ["Total Impressions", totalImpressions.toLocaleString()],
      ["Total Reach", totalReach.toLocaleString()],
      ["Total Engagement", totalEngagement.toLocaleString()],
      ["Accounts", accounts.length.toString()],
      ["Posts Published", variants.filter(v => v.status === "published").length.toString()],
    ],
    theme: "striped",
    headStyles: { fillColor: [88, 86, 214] },
  });

  // Per-account breakdown
  const accountRows = accounts.map(a => {
    const aAnalytics = analytics.filter(an => an.accountId === a.id);
    const aVariants = variants.filter(v => v.accountId === a.id);
    return [
      a.displayName,
      a.platform,
      a.followers.toLocaleString(),
      aAnalytics.reduce((s, x) => s + x.impressions, 0).toLocaleString(),
      aVariants.reduce((s, v) => s + v.likes + v.comments + v.shares, 0).toLocaleString(),
      a.owner?.name ?? "Unassigned",
    ];
  });

  autoTable(doc, {
    head: [["Account", "Platform", "Followers", "Impressions", "Engagement", "Owner"]],
    body: accountRows,
    theme: "grid",
    headStyles: { fillColor: [88, 86, 214] },
    startY: (doc as any).lastAutoTable.finalY + 10,
  });

  // Footer
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(150);
    doc.text(
      `SYNQUE Report — ${report.name} — Page ${i} of ${pageCount}`,
      14,
      doc.internal.pageSize.height - 10
    );
  }

  const pdfBuffer = doc.output("arraybuffer");

  return new NextResponse(pdfBuffer, {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${report.name.replace(/[^a-z0-9]/gi, "_")}.pdf"`,
    },
  });
}
