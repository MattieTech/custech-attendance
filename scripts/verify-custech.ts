import assert from 'assert';
import {
  createDynamicQrPayload,
  verifyQrPayload,
  generateTemporaryCode,
  hashAttendancePin,
  verifyAttendancePin,
  generateClientEventId,
} from '../src/lib/crypto';
import { calculateAttendancePercentage } from '../src/lib/utils';
import { custechDb } from '../src/lib/db/repository';

async function runTests() {
  console.log('🧪 RUNNING CUSTECH DIGITAL ATTENDANCE VERIFICATION SUITE\n');

  // ==========================================
  // TEST 1: Temporary Code Generator
  // ==========================================
  console.log('Test 1: Temporary Code Generation');
  const code = generateTemporaryCode();
  assert.strictEqual(code.length, 6, 'Code must be exactly 6 characters');
  assert.ok(/^[2-9A-HJ-NP-Z]{6}$/.test(code), 'Code must omit ambiguous characters (0, O, 1, I)');
  console.log('  ✓ Generated code:', code);

  // ==========================================
  // TEST 2: Dynamic Rotating QR HMAC Cryptography
  // ==========================================
  console.log('\nTest 2: Dynamic Rotating QR Cryptographic Flow');
  const sessionId = 'test-session-1';
  const courseCode = 'CSC 201';
  const nonce = 'secret_test_nonce_99';
  const rotationSeconds = 20;

  const payload = createDynamicQrPayload(sessionId, courseCode, nonce, rotationSeconds);
  assert.ok(payload.signature.length === 64, 'HMAC-SHA256 signature must be 64 hex chars');

  const validResult = verifyQrPayload(payload, rotationSeconds);
  assert.strictEqual(validResult.isValid, true, 'Fresh dynamic QR token must be valid');
  console.log('  ✓ Verified genuine QR signature within current window');

  // Tampered payload
  const tamperedPayload = { ...payload, signature: 'deadbeef' };
  const invalidResult = verifyQrPayload(tamperedPayload, rotationSeconds);
  assert.strictEqual(invalidResult.isValid, false, 'Tampered token signature must be rejected');
  console.log('  ✓ Correctly rejected tampered signature');

  // Expired payload window
  const expiredPayload = { ...payload, timestampWindow: payload.timestampWindow - 5 };
  const expiredResult = verifyQrPayload(expiredPayload, rotationSeconds);
  assert.strictEqual(expiredResult.isValid, false, 'Expired token window must be rejected');
  console.log('  ✓ Correctly rejected expired QR window');

  // ==========================================
  // TEST 3: Attendance PIN Hashing & Verification
  // ==========================================
  console.log('\nTest 3: Confidential 4-Digit Attendance PIN Security');
  const rawPin = '1234';
  const hashed = await hashAttendancePin(rawPin);
  assert.ok(hashed.startsWith('$2a$') || hashed.startsWith('$2b$'), 'PIN must be bcrypt hashed');

  const pinMatches = await verifyAttendancePin('1234', hashed);
  assert.strictEqual(pinMatches, true, 'Correct PIN must verify');

  const wrongPinMatches = await verifyAttendancePin('9999', hashed);
  assert.strictEqual(wrongPinMatches, false, 'Incorrect PIN must fail');
  console.log('  ✓ Verified 4-digit PIN bcrypt security and protection against guessing');

  // ==========================================
  // TEST 4: Strict Database Deduplication Rule (UNIQUE session_id, student_id)
  // ==========================================
  console.log('\nTest 4: Database-Level Deduplication Constraint');
  const testStudentId = 'stu-1';
  const testSessionId = 'sess-today-csc';

  // First submission
  const firstSubmission = custechDb.recordAttendance({
    sessionId: testSessionId,
    studentId: testStudentId,
    method: 'DYNAMIC_QR',
    recordedBy: 'user-stu-1',
    clientEventId: 'evt_test_1',
  });
  assert.strictEqual(firstSubmission.isDuplicate, false, 'First submission must be accepted');
  console.log('  ✓ First scan logged:', firstSubmission.record.status);

  // Immediate second submission (rapid repeat scan or double click)
  const secondSubmission = custechDb.recordAttendance({
    sessionId: testSessionId,
    studentId: testStudentId,
    method: 'TEMP_CODE',
    recordedBy: 'user-stu-1',
    clientEventId: 'evt_test_2',
  });
  assert.strictEqual(secondSubmission.isDuplicate, true, 'Duplicate scan must be prevented by unique constraint');
  assert.strictEqual(secondSubmission.record.id, firstSubmission.record.id, 'Must return original record');
  console.log('  ✓ Duplicate scan blocked cleanly without polluting database');

  // ==========================================
  // TEST 5: Kiosk Assisted Attendance (Matric + PIN)
  // ==========================================
  console.log('\nTest 5: Kiosk Assisted Attendance (No-Smartphone Workflow)');
  const kioskRes = await custechDb.verifyAndRecordKiosk({
    sessionId: testSessionId,
    matricNumber: 'CUSTECH/2024/CSC/045', // Maryam Yakubu
    attendancePin: '1234',
    assistedReason: 'No smartphone',
    operatorProfileId: 'user-rep',
  });
  assert.strictEqual(kioskRes.success, true, 'Valid Kiosk Matric + PIN must be accepted');
  console.log('  ✓ Kiosk successfully marked attendance for Maryam Yakubu');

  // ==========================================
  // TEST 6: Attendance Analytics & Exam Eligibility Calculation
  // ==========================================
  console.log('\nTest 6: Academic Presence & Exam Eligibility Math');
  // Student with 3 present, 1 late, 1 absent => (4 attended / 5 total) = 80% => Eligible
  const eligibleCalc = calculateAttendancePercentage(3, 1, 1);
  assert.strictEqual(eligibleCalc.percentage, 80);
  assert.strictEqual(eligibleCalc.isEligible, true);
  assert.strictEqual(eligibleCalc.isWarning, false);
  console.log('  ✓ 80% attendance correctly marked ELIGIBLE for examinations');

  // Student with 2 attended, 1 absent => (2 / 3) = 66.7% => Warning
  const warningCalc = calculateAttendancePercentage(2, 0, 1);
  assert.strictEqual(warningCalc.percentage, 66.7);
  assert.strictEqual(warningCalc.isEligible, false);
  assert.strictEqual(warningCalc.isWarning, true);
  console.log('  ✓ 66.7% attendance correctly triggered ATTENDANCE WARNING (<75%)');

  // ==========================================
  // TEST 7: OPTION A - Exam Clearance Docket Generator
  // ==========================================
  console.log('\nTest 7: Option A - Official Exam Clearance Docket & Hall Pass Generator');
  const docket = custechDb.generateExamDocket('stu-1');
  assert.ok(docket.docketNumber.startsWith('CUSTECH/EXAM/2026/'), 'Docket must have official serial');
  assert.ok(docket.courses.length > 0, 'Docket must list enrolled courses');
  assert.ok(docket.verificationToken.startsWith('CUSTECH-DOCKET-'), 'Docket must carry cryptographic verification token');
  console.log('  ✓ Generated Official Exam Docket for', docket.studentName, '(#', docket.docketNumber, ')');
  console.log('  ✓ Courses verified:', docket.courses.map((c) => `${c.courseCode}: ${c.statusText}`).join(', '));

  // ==========================================
  // TEST 8: OPTION B - Anti-Proxy Device Collision Telemetry
  // ==========================================
  console.log('\nTest 8: Option B - Anti-Proxy Device Collision Detection');
  const sharedDeviceFp = 'dev_shared_phone_xyz99';
  // First student on device
  custechDb.recordAttendance({
    sessionId: 'sess-today-csc',
    studentId: 'stu-rep',
    method: 'DYNAMIC_QR',
    recordedBy: 'user-rep',
    deviceFingerprintHash: sharedDeviceFp,
  });

  // Second student attempting on SAME device in SAME session
  const collisionResult = custechDb.recordAttendance({
    sessionId: 'sess-today-csc',
    studentId: 'stu-2',
    method: 'DYNAMIC_QR',
    recordedBy: 'user-stu-2',
    deviceFingerprintHash: sharedDeviceFp,
  });

  assert.strictEqual(collisionResult.record.isFlaggedSuspicious, true, 'Second account from same device must be flagged');
  assert.ok(collisionResult.record.flagReason?.includes('Device Collision'), 'Flag reason must note device collision');
  const alerts = custechDb.getDeviceCollisionAlerts('sess-today-csc');
  assert.ok(alerts.length > 0, 'Collision alert must be recorded for lecturer review');
  console.log('  ✓ Successfully caught proxy attempt: Multiple student accounts sharing device flagged with alert');

  // ==========================================
  // TEST 9: OPTION C - Centralized University Clinic Medical Waiver
  // ==========================================
  console.log('\nTest 9: Option C - Centralized Clinic Medical Waiver Exemption');
  const waiver = custechDb.submitMedicalWaiver({
    studentId: 'stu-3',
    startDate: '2026-08-26',
    endDate: '2026-08-28',
    hospitalName: 'CUSTECH University Health Centre, Osara',
    diagnosisSummary: 'Severe Typhoid Fever with Inpatient Admission',
    doctorName: 'Dr. A. B. Ohiani',
    doctorLicenseNo: 'MDCN/64821',
    approvedBy: 'user-dean',
  });
  assert.strictEqual(waiver.status, 'APPROVED');

  // Check that session on 2026-08-27 for stu-3 is marked EXCUSED
  const stu3Records = custechDb.getRecordsForStudent('stu-3');
  const excusedRecord = stu3Records.find((r) => r.sessionId === 'sess-csc-2');
  assert.strictEqual(excusedRecord?.status, 'EXCUSED', 'Missed session during hospital admission must be EXCUSED');
  console.log('  ✓ Medical waiver successfully converted missed classes during admission to EXCUSED across all courses');

  // ==========================================
  // TEST 10: OPTION D - Attendance Projection & What-If Forecast Math
  // ==========================================
  console.log('\nTest 10: Option D - Attendance Projection & "What-If" Calculator');
  const forecast = custechDb.calculateAttendanceForecast({
    currentAttended: 2,
    currentAbsent: 1,
    remainingLectures: 5,
    projectedAttended: 4,
  });
  assert.strictEqual(forecast.projectedTotalSessions, 8);
  assert.strictEqual(forecast.projectedTotalAttended, 6);
  assert.strictEqual(forecast.projectedPercentage, 75);
  assert.strictEqual(forecast.isEligible, true);
  console.log('  ✓ Forecast calculation (6 of 8 = 75%) accurately verified eligibility target');

  console.log('\n🎉 ALL 10 VERIFICATION TEST SUITES (INCLUDING OPTIONS A, B, C, D) PASSED FLAWLESSLY!\n');
}

runTests().catch((err) => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});
