-- ==============================================================================
-- CUSTECH DIGITAL ATTENDANCE & ACADEMIC PRESENCE MANAGEMENT SYSTEM
-- Confluence University of Science and Technology (CUSTECH), Osara, Nigeria
-- Complete Production PostgreSQL & Supabase Database Migration
-- ==============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ENUM TYPES
CREATE TYPE user_role_enum AS ENUM (
    'SUPER_ADMIN',
    'PRINCIPAL_OFFICER',
    'DEAN',
    'HOD',
    'LECTURER',
    'COURSE_REP',
    'STUDENT',
    'NON_ACADEMIC_STAFF'
);

CREATE TYPE session_status_enum AS ENUM (
    'SCHEDULED',
    'READY',
    'ACTIVE',
    'PAUSED',
    'CLOSED',
    'FINALIZED',
    'CANCELLED',
    'REOPENED'
);

CREATE TYPE attendance_status_enum AS ENUM (
    'PRESENT',
    'LATE',
    'ABSENT',
    'EXCUSED',
    'PENDING'
);

CREATE TYPE attendance_method_enum AS ENUM (
    'DYNAMIC_QR',
    'TEMP_CODE',
    'KIOSK_PIN',
    'LECTURER_MANUAL',
    'ADMIN_ADJUSTMENT'
);

CREATE TYPE correction_status_enum AS ENUM (
    'PENDING',
    'APPROVED',
    'REJECTED'
);

-- PROFILES (Bound to auth.users)
CREATE TABLE IF NOT EXISTS profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL UNIQUE,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    phone TEXT,
    avatar_url TEXT,
    primary_role user_role_enum NOT NULL DEFAULT 'STUDENT',
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ACADEMIC HIERARCHY
CREATE TABLE IF NOT EXISTS faculties (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    dean_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS departments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    faculty_id UUID NOT NULL REFERENCES faculties(id) ON DELETE RESTRICT,
    code TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    hod_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS programs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    department_id UUID NOT NULL REFERENCES departments(id) ON DELETE RESTRICT,
    code TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    duration_years INTEGER NOT NULL DEFAULT 4,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS academic_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    is_current BOOLEAN NOT NULL DEFAULT FALSE,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS semesters (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    academic_session_id UUID NOT NULL REFERENCES academic_sessions(id) ON DELETE CASCADE,
    semester_type TEXT NOT NULL CHECK (semester_type IN ('FIRST', 'SECOND')),
    is_current BOOLEAN NOT NULL DEFAULT FALSE,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    UNIQUE(academic_session_id, semester_type)
);

-- STUDENTS REGISTRY
CREATE TABLE IF NOT EXISTS students (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    profile_id UUID NOT NULL UNIQUE REFERENCES profiles(id) ON DELETE CASCADE,
    matric_number TEXT NOT NULL UNIQUE,
    program_id UUID NOT NULL REFERENCES programs(id) ON DELETE RESTRICT,
    current_level INTEGER NOT NULL CHECK (current_level IN (100, 200, 300, 400, 500)),
    attendance_pin_hash TEXT NOT NULL, -- Hashed 4-digit PIN
    pin_updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_students_matric ON students(matric_number);

-- STAFF REGISTRY
CREATE TABLE IF NOT EXISTS staff (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    profile_id UUID NOT NULL UNIQUE REFERENCES profiles(id) ON DELETE CASCADE,
    staff_number TEXT NOT NULL UNIQUE,
    department_id UUID NOT NULL REFERENCES departments(id) ON DELETE RESTRICT,
    is_academic BOOLEAN NOT NULL DEFAULT TRUE,
    designation TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- CLASSROOMS
CREATE TABLE IF NOT EXISTS classrooms (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code TEXT NOT NULL UNIQUE,
    building TEXT NOT NULL,
    capacity INTEGER NOT NULL DEFAULT 60,
    latitude NUMERIC(10, 8),
    longitude NUMERIC(11, 8),
    radius_meters NUMERIC(6, 2) DEFAULT 80.0,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- COURSES & OFFERINGS
CREATE TABLE IF NOT EXISTS courses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    department_id UUID NOT NULL REFERENCES departments(id) ON DELETE RESTRICT,
    code TEXT NOT NULL UNIQUE,
    title TEXT NOT NULL,
    credit_units INTEGER NOT NULL DEFAULT 2,
    level INTEGER NOT NULL CHECK (level IN (100, 200, 300, 400, 500)),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS course_offerings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    course_id UUID NOT NULL REFERENCES courses(id) ON DELETE RESTRICT,
    semester_id UUID NOT NULL REFERENCES semesters(id) ON DELETE RESTRICT,
    primary_lecturer_id UUID NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(course_id, semester_id)
);

CREATE TABLE IF NOT EXISTS enrollments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    course_offering_id UUID NOT NULL REFERENCES course_offerings(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    enrolled_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(course_offering_id, student_id)
);

CREATE TABLE IF NOT EXISTS course_representatives (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    course_offering_id UUID NOT NULL REFERENCES course_offerings(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    can_operate_kiosk BOOLEAN NOT NULL DEFAULT TRUE,
    appointed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(course_offering_id, student_id)
);

-- TIMETABLES
CREATE TABLE IF NOT EXISTS timetables (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    course_offering_id UUID NOT NULL REFERENCES course_offerings(id) ON DELETE CASCADE,
    classroomId UUID NOT NULL REFERENCES classrooms(id) ON DELETE RESTRICT,
    day_of_week INTEGER NOT NULL CHECK (day_of_week BETWEEN 1 AND 7),
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ATTENDANCE SESSIONS
CREATE TABLE IF NOT EXISTS attendance_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    course_offering_id UUID NOT NULL REFERENCES course_offerings(id) ON DELETE RESTRICT,
    lecturer_id UUID NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
    substitute_lecturer_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    classroom_id UUID REFERENCES classrooms(id) ON DELETE SET NULL,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    scheduled_start TIMESTAMPTZ NOT NULL,
    scheduled_end TIMESTAMPTZ NOT NULL,
    actual_start TIMESTAMPTZ,
    actual_close TIMESTAMPTZ,
    status session_status_enum NOT NULL DEFAULT 'SCHEDULED',
    current_temp_code VARCHAR(6),
    temp_code_expires_at TIMESTAMPTZ,
    qr_rotation_seconds INTEGER NOT NULL DEFAULT 20,
    late_threshold_minutes INTEGER NOT NULL DEFAULT 15,
    session_secret_nonce TEXT NOT NULL DEFAULT encode(gen_random_bytes(16), 'hex'),
    cancellation_reason TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ATTENDANCE RECORDS (CRITICAL DEDUPLICATION CONSTRAINT)
CREATE TABLE IF NOT EXISTS attendance_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES attendance_sessions(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    status attendance_status_enum NOT NULL DEFAULT 'PRESENT',
    method attendance_method_enum NOT NULL,
    recorded_by UUID NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
    client_event_id TEXT UNIQUE, -- Offline idempotency key
    assisted_reason TEXT,
    device_fingerprint_hash TEXT,
    ip_address INET,
    latitude NUMERIC(10, 8),
    longitude NUMERIC(11, 8),
    is_flagged_suspicious BOOLEAN NOT NULL DEFAULT FALSE,
    flag_reason TEXT,
    recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    -- STRICT DATABASE-LEVEL DEDUPLICATION RULE
    CONSTRAINT uq_session_student UNIQUE (session_id, student_id)
);
CREATE INDEX IF NOT EXISTS idx_records_session ON attendance_records(session_id);
CREATE INDEX IF NOT EXISTS idx_records_student ON attendance_records(student_id);

-- ATTENDANCE CORRECTIONS (DISPUTES)
CREATE TABLE IF NOT EXISTS attendance_corrections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES attendance_sessions(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    reason TEXT NOT NULL,
    supporting_doc_url TEXT,
    status correction_status_enum NOT NULL DEFAULT 'PENDING',
    reviewed_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    review_notes TEXT,
    reviewed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_correction_request UNIQUE (session_id, student_id)
);

-- SYLLABUS & COURSE DELIVERY
CREATE TABLE IF NOT EXISTS syllabus_topics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    week_number INTEGER NOT NULL,
    topic_title TEXT NOT NULL,
    learning_objectives TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(course_id, week_number)
);

-- SYSTEM SETTINGS
CREATE TABLE IF NOT EXISTS system_settings (
    key TEXT PRIMARY KEY,
    value JSONB NOT NULL,
    description TEXT,
    updated_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- IMMUTABLE AUDIT TRAIL
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    actor_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    actor_role user_role_enum,
    action TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    entity_id UUID,
    previous_state JSONB,
    new_state JSONB,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_audit_time ON audit_logs(created_at DESC);

-- ==============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ==============================================================================
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance_corrections ENABLE ROW LEVEL SECURITY;

-- Students can read only their own attendance records
CREATE POLICY "Students see own attendance" ON attendance_records
    FOR SELECT
    USING (
        student_id IN (
            SELECT id FROM students WHERE profile_id = auth.uid()
        )
    );

-- Lecturers can see attendance for their assigned course offerings
CREATE POLICY "Lecturers see assigned session records" ON attendance_records
    FOR ALL
    USING (
        session_id IN (
            SELECT s.id FROM attendance_sessions s
            JOIN course_offerings co ON s.course_offering_id = co.id
            WHERE co.primary_lecturer_id = auth.uid() OR s.lecturer_id = auth.uid()
        )
    );
