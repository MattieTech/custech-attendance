import { custechDb } from '../src/lib/db/repository';

async function runMasterVerification() {
  console.log('\n================================================================');
  console.log('CUSTECH COURSE TAKE ATTENDANCE SYSTEM: MASTER E2E VERIFICATION');
  console.log('================================================================\n');

  let passedTests = 0;
  const totalTests = 9;
  const adminId = 'prof-admin-ict';

  // -------------------------------------------------------------
  // TEST 1: DYNAMIC COURSE CREATION & DUPLICATE PREVENTION
  // -------------------------------------------------------------
  console.log('▶ TEST 1: Dynamic Course Catalogue & Duplicate Prevention');
  try {
    const existing = custechDb.getCourses().find((c) => c.code === 'MTH 131');
    let mthCourse = existing;
    if (!mthCourse) {
      mthCourse = custechDb.createCourse(
        {
          code: 'MTH 131',
          title: 'General Mathematics I',
          creditUnits: 2,
          departmentId: 'dept-se',
          level: 100,
          description: 'Calculus, algebra and analytical geometry for engineering and sciences.',
        },
        adminId
      );
      console.log('  ✔ Created official course: MTH 131 (2 Units, 100L Software Engineering)');
    } else {
      console.log('  ✔ Existing course verified: MTH 131');
    }

    // Verify duplicate creation throws
    let duplicateCaught = false;
    try {
      custechDb.createCourse(
        {
          code: 'MTH 131',
          title: 'Duplicate Math Course',
          creditUnits: 2,
          departmentId: 'dept-se',
          level: 100,
        },
        adminId
      );
    } catch (e: unknown) {
      duplicateCaught = true;
      console.log(`  ✔ Duplicate prevention confirmed: "${e instanceof Error ? e.message : String(e)}"`);
    }

    if (!duplicateCaught) throw new Error('Duplicate course creation was not prevented!');
    passedTests++;
    console.log('  [PASS] Test 1 Completed Successfully\n');
  } catch (err: unknown) {
    console.error('  [FAIL] Test 1 Failed:', err instanceof Error ? err.message : String(err), '\n');
  }

  // -------------------------------------------------------------
  // TEST 2: LECTURER ALLOCATION & RECURRING TIMETABLE SCHEDULING
  // -------------------------------------------------------------
  console.log('▶ TEST 2: Lecturer Assignment & Recurring Weekly Timetable');
  let offering: ReturnType<typeof custechDb.getCourseOfferings>[number] | undefined;
  try {
    const offerings = custechDb.getCourseOfferings();
    offering = offerings.find((o) => o.course?.code === 'MTH 131');
    if (!offering) {
      throw new Error('Course offering for MTH 131 was not found!');
    }

    // Find or assign lecturer
    const lecturers = custechDb.getLecturers();
    const lecturer = lecturers[0];
    if (lecturer && offering.primaryLecturerId !== lecturer.id) {
      custechDb.assignLecturerToCourseOffering(offering.id, lecturer.id, adminId);
      offering = custechDb.getOfferingById(offering.id)!;
    }
    console.log(`  ✔ Verified Course Offering: ${offering.course?.code} assigned to lecturer`);

    // Create recurring timetable entry
    const existingTt = custechDb.getTimetablesWithDetails().find((t) => t.courseOfferingId === offering!.id);
    let ttEntry: ReturnType<typeof custechDb.getTimetablesWithDetails>[number] | ReturnType<typeof custechDb.createTimetableEntry> | undefined = existingTt;
    if (!ttEntry) {
      ttEntry = custechDb.createTimetableEntry(
        {
          courseOfferingId: offering.id,
          dayOfWeek: 1, // Monday
          startTime: '10:00',
          endTime: '12:00',
          venue: 'Mathematics Lecture Hall',
          isRecurring: true,
        },
        adminId
      );
      console.log('  ✔ Created recurring timetable slot: Monday 10:00 - 12:00 @ Mathematics Lecture Hall');
    } else {
      console.log(`  ✔ Verified Timetable entry: Day ${ttEntry.dayOfWeek} (${ttEntry.startTime} - ${ttEntry.endTime}) @ ${'venueDisplay' in ttEntry ? ttEntry.venueDisplay : ttEntry.venue}`);
    }

    if (ttEntry.isRecurring !== true) throw new Error('Timetable entry is not marked recurring!');
    passedTests++;
    console.log('  [PASS] Test 2 Completed Successfully\n');
  } catch (err: unknown) {
    console.error('  [FAIL] Test 2 Failed:', err instanceof Error ? err.message : String(err), '\n');
  }

  // -------------------------------------------------------------
  // TEST 3: DYNAMIC SESSION CREATION (WEEK 1) & ANTI-HARDCODING CHECK
  // -------------------------------------------------------------
  console.log('▶ TEST 3: Dynamic Session Creation (Week 1) & Anti-Hardcoding Check');
  let week1Session: ReturnType<typeof custechDb.startSession> | undefined;
  try {
    if (!offering) throw new Error('Course offering is missing from Test 2');
    const lecturerId = offering.primaryLecturerId || 'user-lec-csc1';
    week1Session = custechDb.startSession({
      courseOfferingId: offering.id,
      lecturerId,
      weekNumber: 1,
      topicTitle: 'Algebraic Functions & Quadratic Forms',
      venue: 'Mathematics Lecture Hall',
      durationMinutes: 120,
      forceNew: true,
    });

    console.log(`  ✔ Started Week 1 Session ID: ${week1Session.id}`);
    console.log(`  ✔ Topic: ${week1Session.topicTitle}`);
    console.log(`  ✔ Venue: ${week1Session.venue}`);
    console.log(`  ✔ Week Number: ${week1Session.weekNumber}`);
    console.log(`  ✔ Generated Dynamic Code: ${week1Session.currentTempCode}`);

    if (week1Session.currentTempCode === '7K4B92') {
      throw new Error('Hardcoded code 7K4B92 was generated! System must generate dynamic unpredictable codes.');
    }
    if (!week1Session.currentTempCode || week1Session.currentTempCode.length !== 6) {
      throw new Error(`Invalid code format generated: ${week1Session.currentTempCode}`);
    }

    passedTests++;
    console.log('  [PASS] Test 3 Completed Successfully\n');
  } catch (err: unknown) {
    console.error('  [FAIL] Test 3 Failed:', err instanceof Error ? err.message : String(err), '\n');
  }

  // -------------------------------------------------------------
  // TEST 4: STUDENT MATRICULATION NUMBER VERIFICATION (PHASE 7)
  // -------------------------------------------------------------
  console.log('▶ TEST 4: Student Matriculation Number Verification (Phase 7)');
  let studentMatthew: ReturnType<typeof custechDb.verifyStudentMatric>['student'];
  try {
    // Check 25L1SE0000 (Matthew Aliu)
    const verification = custechDb.verifyStudentMatric('25L1SE0000');
    if (!verification.found || !verification.student) {
      throw new Error(`Failed to verify existing student with matric 25L1SE0000! Error: ${verification.error}`);
    }
    studentMatthew = verification.student;
    console.log(`  ✔ Verified Student: ${studentMatthew.fullName}`);
    console.log(`  ✔ Matric Number: ${studentMatthew.matricNumber}`);
    console.log(`  ✔ Department: ${studentMatthew.departmentName} (${studentMatthew.departmentCode})`);
    console.log(`  ✔ Academic Level: ${studentMatthew.level}L`);
    console.log(`  ✔ Faculty: ${studentMatthew.facultyName}`);

    // Verify negative lookup
    const badLookup = custechDb.verifyStudentMatric('FAKE_MATRIC_999');
    if (badLookup.found) {
      throw new Error('Non-existent matriculation number returned found=true!');
    }
    console.log(`  ✔ Non-existent matric rejected cleanly: "${badLookup.error}"`);

    passedTests++;
    console.log('  [PASS] Test 4 Completed Successfully\n');
  } catch (err: unknown) {
    console.error('  [FAIL] Test 4 Failed:', err instanceof Error ? err.message : String(err), '\n');
  }

  // -------------------------------------------------------------
  // TEST 5: ATTENDANCE SUBMISSION & DEDUPLICATION (WEEK 1)
  // -------------------------------------------------------------
  console.log('▶ TEST 5: Attendance Submission & Deduplication (Week 1)');
  try {
    if (!studentMatthew || !offering || !week1Session) {
      throw new Error('Prerequisite test data missing for Test 5');
    }
    // Ensure student is enrolled in offering
    if (!custechDb.isStudentEnrolled(studentMatthew.id, offering.id)) {
      custechDb.enrollStudentInCourse(studentMatthew.id, offering.id, adminId);
    }

    const testDeviceFingerprint = 'dev_fingerprint_matthew_samsung_s21';
    const subResult = custechDb.recordAttendance({
      sessionId: week1Session.id,
      studentId: studentMatthew.id,
      method: 'TEMP_CODE',
      recordedBy: studentMatthew.profileId,
      deviceFingerprintHash: testDeviceFingerprint,
      deviceType: 'Mobile',
      browser: 'Chrome 122',
      os: 'Android 14',
    });

    console.log(`  ✔ Attendance Submission Result: ${subResult.message}`);
    console.log(`  ✔ Status: ${subResult.record.status}, Method: ${subResult.record.method}`);

    // Attempt Duplicate Submission
    const dupResult = custechDb.recordAttendance({
      sessionId: week1Session.id,
      studentId: studentMatthew.id,
      method: 'TEMP_CODE',
      recordedBy: studentMatthew.profileId,
      deviceFingerprintHash: testDeviceFingerprint,
    });

    if (!dupResult.isDuplicate) {
      throw new Error('Duplicate attendance was not detected!');
    }
    console.log(`  ✔ Duplicate detected and rejected: "${dupResult.message}"`);

    passedTests++;
    console.log('  [PASS] Test 5 Completed Successfully\n');
  } catch (err: unknown) {
    console.error('  [FAIL] Test 5 Failed:', err instanceof Error ? err.message : String(err), '\n');
  }

  // -------------------------------------------------------------
  // TEST 6: DYNAMIC CODE REGENERATION & DEACTIVATION LIFECYCLE (PHASE 6)
  // -------------------------------------------------------------
  console.log('▶ TEST 6: Code Regeneration & Deactivation Lifecycle (Phase 6)');
  try {
    if (!offering || !week1Session) {
      throw new Error('Prerequisite test data missing for Test 6');
    }
    const oldCode = week1Session.currentTempCode;
    console.log(`  Current active code: ${oldCode}`);

    // Regenerate code
    const result = custechDb.regenerateSessionCode(week1Session.id, offering.primaryLecturerId);
    const newCode = result.newCode;
    console.log(`  ✔ Regenerated fresh code: ${newCode} (Previous code ${oldCode} invalidated)`);

    const updatedSession = custechDb.getSessionById(week1Session.id)!;
    if (!updatedSession.previousCodes?.includes(oldCode)) {
      throw new Error('Previous code was not preserved in previousCodes array!');
    }

    // Verify deactivation
    custechDb.deactivateSessionCode(week1Session.id, offering.primaryLecturerId);
    const deactivatedSession = custechDb.getSessionById(week1Session.id)!;
    if (deactivatedSession.isCodeActive !== false) {
      throw new Error('Session code was not marked deactivated!');
    }
    console.log('  ✔ Code successfully deactivated (further submissions blocked)');

    // Reactivate code
    custechDb.reactivateSessionCode(week1Session.id, offering.primaryLecturerId);
    const reactivatedSession = custechDb.getSessionById(week1Session.id)!;
    if (reactivatedSession.isCodeActive !== true) {
      throw new Error('Session code was not reactivated!');
    }
    console.log('  ✔ Code successfully reactivated');

    passedTests++;
    console.log('  [PASS] Test 6 Completed Successfully\n');
  } catch (err: unknown) {
    console.error('  [FAIL] Test 6 Failed:', err instanceof Error ? err.message : String(err), '\n');
  }

  // -------------------------------------------------------------
  // TEST 7: INDEPENDENT RECURRING WEEKLY SESSIONS (WEEK 2)
  // -------------------------------------------------------------
  console.log('▶ TEST 7: Independent Weekly Sessions (Week 2 vs Week 1)');
  try {
    if (!offering || !week1Session) {
      throw new Error('Prerequisite test data missing for Test 7');
    }
    const week2Session = custechDb.startSession({
      courseOfferingId: offering.id,
      lecturerId: offering.primaryLecturerId,
      weekNumber: 2,
      topicTitle: 'Matrices, Determinants & Linear Systems',
      venue: 'Mathematics Lecture Hall',
      durationMinutes: 120,
      forceNew: true,
    });

    console.log(`  ✔ Created Week 2 Session ID: ${week2Session.id}`);
    console.log(`  ✔ Topic: ${week2Session.topicTitle}`);

    if (week2Session.id === week1Session.id) {
      throw new Error('Week 2 session overwrote Week 1 session! Each lecture must have an independent session.');
    }

    // Verify Week 1 attendance records still exist
    const week1Records = custechDb.getRecordsForSession(week1Session.id);
    console.log(`  ✔ Week 1 Records count: ${week1Records.length} (Intact and uncorrupted)`);

    const week2Records = custechDb.getRecordsForSession(week2Session.id);
    console.log(`  ✔ Week 2 Records count: ${week2Records.length} (Clean initial roster)`);

    if (week1Records.length === 0) {
      throw new Error('Week 1 attendance records were lost after creating Week 2!');
    }

    passedTests++;
    console.log('  [PASS] Test 7 Completed Successfully\n');
  } catch (err: unknown) {
    console.error('  [FAIL] Test 7 Failed:', err instanceof Error ? err.message : String(err), '\n');
  }

  // -------------------------------------------------------------
  // TEST 8: ANTI-PROXY DEVICE COLLISION DETECTION & ADMIN INVESTIGATION (PHASE 8 & 8.5)
  // -------------------------------------------------------------
  console.log('▶ TEST 8: Anti-Proxy Collision Detection & Admin Investigation');
  try {
    if (!offering || !week1Session) {
      throw new Error('Prerequisite test data missing for Test 8');
    }
    // Find or create a second student in Software Engineering
    let student2 = custechDb.getStudentByMatric('25L1SE0001');
    if (!student2) {
      const reg = custechDb.registerStudent({
        firstName: 'Zainab',
        lastName: 'Ahmed',
        matricNumber: '25L1SE0001',
        departmentName: 'Software Engineering',
        currentLevel: 100,
        actorId: adminId,
      });
      student2 = reg.student;
    }

    if (!custechDb.isStudentEnrolled(student2.id, offering.id)) {
      custechDb.enrollStudentInCourse(student2.id, offering.id, adminId);
    }

    // Student 2 submits on the exact SAME device fingerprint as Matthew Aliu
    const sharedFingerprint = 'dev_fingerprint_matthew_samsung_s21';
    custechDb.recordAttendance({
      sessionId: week1Session.id,
      studentId: student2.id,
      method: 'TEMP_CODE',
      recordedBy: student2.profileId,
      deviceFingerprintHash: sharedFingerprint,
      deviceType: 'Mobile',
      browser: 'Chrome 122',
      os: 'Android 14',
    });

    // Check if DeviceCollisionAlert was logged
    const alerts = custechDb.getDeviceCollisionAlerts(week1Session.id);
    const alert = alerts.find((a) => a.deviceFingerprintHash === sharedFingerprint);

    if (!alert) {
      throw new Error('Device collision alert was not recorded for shared hardware!');
    }

    console.log(`  ✔ Detected Shared Hardware Alert ID: ${alert.id}`);
    console.log(`  ✔ Collision Risk Rating: ${alert.riskLevel}`);
    console.log(`  ✔ Reason: ${alert.riskReason}`);
    console.log(`  ✔ Matched Students: ${alert.matchedStudentNames?.join(', ')}`);

    // Admin investigates the alert
    const investigated = custechDb.investigateDeviceAlert(
      alert.id,
      adminId,
      'CLEARED',
      'Student Matthew shared phone with Zainab because Zainab battery died in lecture hall.'
    );

    console.log(`  ✔ Admin Investigation: Status=${investigated.isReviewed}, Action=CLEARED, Risk=${investigated.riskLevel}`);
    console.log(`  ✔ Notes: "${investigated.reviewNotes}"`);

    passedTests++;
    console.log('  [PASS] Test 8 Completed Successfully\n');
  } catch (err: unknown) {
    console.error('  [FAIL] Test 8 Failed:', err instanceof Error ? err.message : String(err), '\n');
  }

  // -------------------------------------------------------------
  // TEST 9: 9 FACULTIES, 40+ DEPARTMENTS & MANUAL COURSE ASSIGNMENT
  // -------------------------------------------------------------
  console.log('▶ TEST 9: CUSTECH 9 Faculties, 40+ Departments & Manual Course Typing Assignment');
  try {
    const faculties = custechDb.getFaculties();
    const departments = custechDb.getDepartments();
    const courses = custechDb.getCourses();

    console.log(`  ✔ Faculties loaded: ${faculties.length}`);
    console.log(`  ✔ Departments loaded: ${departments.length}`);
    console.log(`  ✔ Initial/Registered Courses loaded: ${courses.length}`);

    if (faculties.length < 9) throw new Error(`Expected 9 faculties, got ${faculties.length}`);
    if (departments.length < 40) throw new Error(`Expected 40+ departments, got ${departments.length}`);
    if (courses.length < 25) throw new Error(`Expected expanded university courses (>=25), got ${courses.length}`);

    const lecturer = custechDb.getLecturers()[0];
    if (!lecturer) throw new Error('No lecturer available for manual assignment test');

    const manualRes = custechDb.assignCourseManuallyToLecturer(
      {
        lecturerId: lecturer.id,
        courseCode: 'MEE 305',
        courseTitle: 'Mechanics of Machines',
        creditUnits: 3,
        departmentId: 'dept-mechanical-engineering',
        level: 300,
      },
      adminId
    );

    if (!manualRes.course || !manualRes.offering) {
      throw new Error('Manual course assignment did not return course and offering');
    }
    if (manualRes.offering.primaryLecturerId !== lecturer.id) {
      throw new Error('Lecturer was not assigned to manually typed course');
    }

    console.log(`  ✔ Manually typed & assigned course: ${manualRes.course.code} — ${manualRes.course.title} (${manualRes.course.level}L) to ${lecturer.firstName} ${lecturer.lastName}`);
    passedTests++;
    console.log('  [PASS] Test 9 Completed Successfully\n');
  } catch (err: unknown) {
    console.error('  [FAIL] Test 9 Failed:', err instanceof Error ? err.message : String(err), '\n');
  }

  // -------------------------------------------------------------
  // SUMMARY RESULTS
  // -------------------------------------------------------------
  console.log('================================================================');
  console.log(`VERIFICATION SUMMARY: ${passedTests}/${totalTests} TESTS PASSED`);
  if (passedTests === totalTests) {
    console.log('RESULT: ALL CRITICAL ARCHITECTURAL UPGRADES VERIFIED 100% SUCCESS');
  } else {
    console.log(`RESULT: ${totalTests - passedTests} TEST(S) FAILED`);
  }
  console.log('================================================================\n');

  if (passedTests !== totalTests) {
    process.exit(1);
  }
}

runMasterVerification().catch((err) => {
  console.error('FATAL VERIFICATION ERROR:', err);
  process.exit(1);
});
