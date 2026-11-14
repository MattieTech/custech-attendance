import { NextResponse } from 'next/server';
import { custechDb } from '@/lib/db/repository';
import { getCloudStorageConfig, isCloudConfigured, saveToCloud } from '@/lib/db/cloud-storage';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const key = searchParams.get('key');

    const config = getCloudStorageConfig();
    const isConfigured = isCloudConfigured();

    const profiles = custechDb.getProfiles();
    const students = custechDb.getAllStudentsDetailed();
    const courses = custechDb.getCourses();

    // If no key provided, return diagnostic status
    if (!key) {
      return NextResponse.json({
        cloudConfigured: isConfigured,
        provider: config.provider,
        profilesCount: profiles.length,
        studentsCount: students.length,
        coursesCount: courses.length,
        message: 'Pass ?key=custech2026 to seed all records into the cloud database.',
      });
    }

    if (key !== 'custech2026' && key !== 'admin') {
      return NextResponse.json(
        { error: 'Invalid key. Pass ?key=custech2026' },
        { status: 401 }
      );
    }

    const payload = custechDb.getAuthoritativePayload();

    let cloudSaved = false;
    if (isConfigured) {
      cloudSaved = await saveToCloud(payload);
    }

    return NextResponse.json({
      success: true,
      cloudConfigured: isConfigured,
      provider: config.provider,
      cloudSaved,
      summary: {
        profilesCount: profiles.length,
        studentsCount: students.length,
        coursesCount: courses.length,
        timestamp: new Date().toISOString(),
      },
      message: isConfigured && cloudSaved
        ? 'Successfully seeded CUSTECH cloud database (Vercel KV / Upstash) with all existing records!'
        : isConfigured && !cloudSaved
        ? 'Cloud database is configured, but the save request failed. Check KV permissions.'
        : 'Local store loaded, but cloud database environment variables were not detected on this instance. Ensure KV is connected and redeployed.',
    });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ success: false, error: errorMsg }, { status: 500 });
  }
}
