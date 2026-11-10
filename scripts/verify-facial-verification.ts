import fs from 'fs';
import path from 'path';
import { custechDb } from '../src/lib/db/repository';
import { submitStudentAttendanceWithMatric } from '../src/actions/attendance';

function makeDescriptor(seed: number, noiseAmp = 0): number[] {
  const vec: number[] = [];
  for (let i = 0; i < 128; i++) {
    const base = Math.sin(seed * 13.37 + i * 0.41) * 0.14;
    const noise = noiseAmp > 0 ? Math.cos(i * 1.7 + seed) * noiseAmp : 0;
    vec.push(Number((base + noise).toFixed(6)));
  }
  return vec;
}

async function runFacialVerificationTests() {
  console.log('\n================================================================');
  console.log('CUSTECH BIOMETRIC FACIAL VERIFICATION: INTEGRITY TEST SUITE');
  console.log('================================================================\n');

  const storePath = path.join(process.cwd(), 'src', 'data', 'custech_store.json');
  const originalStore = fs.existsSync(storePath) ? fs.readFileSync(storePath, 'utf8') : null;

  let passed = 0;
  const total = 8;

  try {
    // Ensure facial verification policy is enabled
    custechDb.updateSystemSettings({ requireFacialVerification: true, facialMatchThreshold: 0.50 }, 'user-admin');

    // Create a clean temporary active session for testing so existing records don't collide
    const testSession = custechDb.startSession({
      courseOfferingId: 'offering-csc201',
      lecturerId: 'user-lecturer-1',
      venue: 'Biometric Integrity Test Hall',
      weekNumber: 99,
      topicTitle: 'Biometric Anti-Proxy Test Session',
      durationMinutes: 60,
      forceNew: true,
    });

    const studentA = custechDb.getStudentByMatric('25L1CS1014')!;
    const studentB = custechDb.getStudentByMatric('25L1CS1029')!;
    if (!studentA || !studentB) {
      throw new Error('Seed students 25L1CS1014 / 25L1CS1029 not found');
    }

    // Reset any pre-existing test face profiles for clean run
    custechDb.resetStudentFace(studentA.id, 'user-admin');
    custechDb.resetStudentFace(studentB.id, 'user-admin');

    const faceA = makeDescriptor(1);
    const faceB = makeDescriptor(42);

    // TEST 1: PIN-protected initial Face ID enrollment
    console.log('▶ TEST 1: First-Time PIN-Protected Face ID Enrollment');
    const badPinRes = await custechDb.enrollStudentFace({
      studentIdOrProfileId: studentA.id,
      descriptor: faceA,
      actorProfileId: studentA.profileId,
      attendancePin: '9999',
      requirePinVerification: true,
    });
    if (badPinRes.success) throw new Error('Wrong PIN should NOT authorize Face ID enrollment!');

    const enrollARes = await custechDb.enrollStudentFace({
      studentIdOrProfileId: studentA.id,
      descriptor: faceA,
      actorProfileId: studentA.profileId,
      attendancePin: '1234',
      requirePinVerification: true,
    });
    if (!enrollARes.success) throw new Error(`Expected Student A enrollment to succeed: ${enrollARes.message}`);
    console.log('  ✔ Wrong PIN rejected; valid PIN enrolled & locked Student A Face ID\n');
    passed++;

    // TEST 2: Enrollment Lock Prevention
    console.log('▶ TEST 2: Self-Overwrite / Enrollment Lock Protection');
    const overwriteRes = await custechDb.enrollStudentFace({
      studentIdOrProfileId: studentA.id,
      descriptor: faceB,
      actorProfileId: studentA.profileId,
    });
    if (overwriteRes.success) throw new Error('Locked Face ID should NOT be overwritable without Admin reset!');
    console.log(`  ✔ Locked profile overwrite blocked: "${overwriteRes.message}"\n`);
    passed++;

    // TEST 3: Duplicate Cross-Student Face Enrollment Block
    console.log('▶ TEST 3: Block Same Face Enrolling on Friend Account');
    const dupEnrollRes = await custechDb.enrollStudentFace({
      studentIdOrProfileId: studentB.id,
      descriptor: makeDescriptor(1, 0.01), // Student A's face with tiny noise
      actorProfileId: studentB.profileId,
    });
    if (dupEnrollRes.success) throw new Error('Duplicate face across two students should be blocked!');
    console.log(`  ✔ Duplicate face enrollment blocked: "${dupEnrollRes.message}"\n`);
    passed++;

    // Enroll Student B with their own distinct face
    const enrollBRes = await custechDb.enrollStudentFace({
      studentIdOrProfileId: studentB.id,
      descriptor: faceB,
      actorProfileId: studentB.profileId,
    });
    if (!enrollBRes.success) throw new Error(`Expected Student B enrollment to succeed: ${enrollBRes.message}`);

    // TEST 4: Missing Facial Scan Rejection
    console.log('▶ TEST 4: Reject Attendance Submission Without Facial Scan');
    const missingScanRes = await submitStudentAttendanceWithMatric({
      matricNumber: studentA.matricNumber,
      sessionId: testSession.id,
      code: testSession.currentTempCode,
    });
    if (missingScanRes.success || missingScanRes.biometricErrorCode !== 'MISSING_SCAN') {
      throw new Error(`Expected MISSING_SCAN rejection, got: ${JSON.stringify(missingScanRes)}`);
    }
    console.log(`  ✔ Missing scan rejected (${missingScanRes.biometricErrorCode})\n`);
    passed++;

    // TEST 5: Photo Spoof / Liveness Failed Rejection
    console.log('▶ TEST 5: Reject Static Photo / Failed Liveness Challenge');
    const spoofRes = await submitStudentAttendanceWithMatric({
      matricNumber: studentA.matricNumber,
      sessionId: testSession.id,
      code: testSession.currentTempCode,
      faceVerification: {
        descriptor: faceA,
        livenessPassed: false,
        livenessChallenge: 'BLINK',
        capturedAt: new Date().toISOString(),
      },
    });
    if (spoofRes.success || spoofRes.biometricErrorCode !== 'LIVENESS_FAILED') {
      throw new Error(`Expected LIVENESS_FAILED rejection, got: ${JSON.stringify(spoofRes)}`);
    }
    console.log(`  ✔ Static photo / failed liveness rejected (${spoofRes.biometricErrorCode})\n`);
    passed++;

    // TEST 6: Friend Impersonation / Face Mismatch Rejection + Fraud Alert
    console.log('▶ TEST 6: Reject Friend Marking Attendance for Student B');
    const proxyRes = await submitStudentAttendanceWithMatric({
      matricNumber: studentB.matricNumber,
      sessionId: testSession.id,
      code: testSession.currentTempCode,
      faceVerification: {
        descriptor: faceA, // Student A's face trying to mark Student B!
        livenessPassed: true,
        livenessChallenge: 'BLINK',
        capturedAt: new Date().toISOString(),
      },
    });
    if (proxyRes.success || proxyRes.biometricErrorCode !== 'FACE_MISMATCH') {
      throw new Error(`Expected FACE_MISMATCH rejection, got: ${JSON.stringify(proxyRes)}`);
    }
    const alerts = custechDb.getDeviceCollisionAlerts(testSession.id);
    const bioAlert = alerts.find((a) => a.alertType === 'BIOMETRIC_PROXY_ATTEMPT');
    if (!bioAlert) throw new Error('Expected BIOMETRIC_PROXY_ATTEMPT alert to be logged!');
    console.log(`  ✔ Proxy attempt blocked & logged alert: "${bioAlert.riskReason}"\n`);
    passed++;

    // TEST 7: Legitimate Student Verification & Confidence Recording
    console.log('▶ TEST 7: Accept Legitimate Student With Liveness & Natural Variance');
    const validRes = await submitStudentAttendanceWithMatric({
      matricNumber: studentA.matricNumber,
      sessionId: testSession.id,
      code: testSession.currentTempCode,
      faceVerification: {
        descriptor: makeDescriptor(1, 0.02),
        livenessPassed: true,
        livenessChallenge: 'BLINK',
        blinkDetected: true,
        capturedAt: new Date().toISOString(),
      },
    });
    if (!validRes.success || !validRes.record?.facialVerified) {
      throw new Error(`Expected verified attendance success, got: ${JSON.stringify(validRes)}`);
    }
    console.log(
      `  ✔ Verified Student A (${validRes.record.status}, facialConfidence=${validRes.record.facialConfidence}%)\n`
    );
    passed++;

    // TEST 8: Admin Face ID Reset & Re-Enrollment
    console.log('▶ TEST 8: Admin Biometric Reset & Re-Enrollment');
    const resetOk = custechDb.resetStudentFace(studentA.id, 'user-admin');
    if (!resetOk) throw new Error('Admin resetStudentFace failed');
    const statusAfterReset = custechDb.getFaceProfileStatus(studentA.id);
    if (statusAfterReset.enrolled) throw new Error('Face ID should be cleared after admin reset');
    console.log('  ✔ Admin reset cleared Face ID lock cleanly\n');
    passed++;
  } finally {
    // Restore original custech_store.json so workspace data remains clean
    if (originalStore !== null) {
      fs.writeFileSync(storePath, originalStore, 'utf8');
    } else if (fs.existsSync(storePath)) {
      fs.unlinkSync(storePath);
    }
  }

  console.log('================================================================');
  console.log(`BIOMETRIC VERIFICATION SUMMARY: ${passed}/${total} TESTS PASSED`);
  console.log('================================================================\n');

  if (passed !== total) {
    process.exit(1);
  }
}

runFacialVerificationTests().catch((err) => {
  console.error('FATAL BIOMETRIC TEST ERROR:', err);
  process.exit(1);
});
