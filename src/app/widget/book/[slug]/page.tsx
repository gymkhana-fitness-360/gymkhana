import { headers } from "next/headers";

export default async function BookWidgetPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? "http";
  const src = `${proto}://${host}/book/${slug}`;

  return (
    <html lang="en">
      <body style={{ margin: 0 }}>
        <iframe
          src={src}
          title="Book a trial"
          style={{ width: "100%", minHeight: "720px", border: "none" }}
        />
      </body>
    </html>
  );
}
