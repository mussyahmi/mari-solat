export const dynamic = 'force-dynamic';

export function GET() {
  return Response.json({ version: process.env.BUILD_TIME ?? 'unknown' });
}
