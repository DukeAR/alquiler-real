import { db } from './config/db';

export const initDB = async () => {
  // ============================================================
  // USERS TABLE
  // These columns were confirmed to exist in the DB schema.
  // We only add columns if they don't already exist (safe migrations).
  // ============================================================
  await db.query(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT CHECK (role IN ('tenant', 'host')) NOT NULL DEFAULT 'tenant',
      name TEXT NOT NULL DEFAULT 'Usuario',
      zone TEXT,
      phone TEXT,
      bio TEXT,
      interests TEXT,
      member_since TIMESTAMP DEFAULT NOW(),
      created_at TIMESTAMP DEFAULT NOW(),
      identity_validated BOOLEAN DEFAULT FALSE,
      email_verified BOOLEAN DEFAULT FALSE,
      phone_verified BOOLEAN DEFAULT FALSE,
      validation_level TEXT DEFAULT 'basic',
      dni_front TEXT,
      dni_back TEXT,
      selfie_with_dni TEXT,
      dni_number TEXT,
      profile_photo TEXT,
      rating REAL DEFAULT 0,
      total_reviews INTEGER DEFAULT 0,
      is_host BOOLEAN DEFAULT FALSE,
      host_verified BOOLEAN DEFAULT FALSE,
      host_rating REAL DEFAULT 0,
      total_properties INTEGER DEFAULT 0,
      total_bookings_hosted INTEGER DEFAULT 0,
      badge TEXT DEFAULT 'Nuevo usuario',
      trust_score INTEGER DEFAULT 0,
      risk_score INTEGER DEFAULT 0,
      is_email_verified BOOLEAN DEFAULT FALSE,
      is_phone_verified BOOLEAN DEFAULT FALSE,
      is_identity_verified BOOLEAN DEFAULT FALSE
    );
  `);

  // Safety migrations for missing columns on users table
  await db.query(`
    DO $$ BEGIN
      BEGIN ALTER TABLE users ADD COLUMN password_hash TEXT DEFAULT ''; EXCEPTION WHEN duplicate_column THEN NULL; END;
      BEGIN ALTER TABLE users ADD COLUMN zone TEXT; EXCEPTION WHEN duplicate_column THEN NULL; END;
      BEGIN ALTER TABLE users ADD COLUMN role TEXT DEFAULT 'tenant'; EXCEPTION WHEN duplicate_column THEN NULL; END;
      BEGIN ALTER TABLE users ADD COLUMN email_verified BOOLEAN DEFAULT FALSE; EXCEPTION WHEN duplicate_column THEN NULL; END;
      BEGIN ALTER TABLE users ADD COLUMN phone_verified BOOLEAN DEFAULT FALSE; EXCEPTION WHEN duplicate_column THEN NULL; END;
      BEGIN ALTER TABLE users ADD COLUMN identity_validated BOOLEAN DEFAULT FALSE; EXCEPTION WHEN duplicate_column THEN NULL; END;
      BEGIN ALTER TABLE users ADD COLUMN validation_level TEXT DEFAULT 'basic'; EXCEPTION WHEN duplicate_column THEN NULL; END;
      BEGIN ALTER TABLE users ADD COLUMN dni_number TEXT; EXCEPTION WHEN duplicate_column THEN NULL; END;
      BEGIN ALTER TABLE users ADD COLUMN profile_photo TEXT; EXCEPTION WHEN duplicate_column THEN NULL; END;
      BEGIN ALTER TABLE users ADD COLUMN rating REAL DEFAULT 0; EXCEPTION WHEN duplicate_column THEN NULL; END;
      BEGIN ALTER TABLE users ADD COLUMN total_reviews INTEGER DEFAULT 0; EXCEPTION WHEN duplicate_column THEN NULL; END;
      BEGIN ALTER TABLE users ADD COLUMN is_host BOOLEAN DEFAULT FALSE; EXCEPTION WHEN duplicate_column THEN NULL; END;
      BEGIN ALTER TABLE users ADD COLUMN host_verified BOOLEAN DEFAULT FALSE; EXCEPTION WHEN duplicate_column THEN NULL; END;
      BEGIN ALTER TABLE users ADD COLUMN host_rating REAL DEFAULT 0; EXCEPTION WHEN duplicate_column THEN NULL; END;
      BEGIN ALTER TABLE users ADD COLUMN total_properties INTEGER DEFAULT 0; EXCEPTION WHEN duplicate_column THEN NULL; END;
      BEGIN ALTER TABLE users ADD COLUMN total_bookings_hosted INTEGER DEFAULT 0; EXCEPTION WHEN duplicate_column THEN NULL; END;
      BEGIN ALTER TABLE users ADD COLUMN badge TEXT DEFAULT 'Nuevo usuario'; EXCEPTION WHEN duplicate_column THEN NULL; END;
      BEGIN ALTER TABLE users ADD COLUMN trust_score INTEGER DEFAULT 0; EXCEPTION WHEN duplicate_column THEN NULL; END;
      BEGIN ALTER TABLE users ADD COLUMN risk_score INTEGER DEFAULT 0; EXCEPTION WHEN duplicate_column THEN NULL; END;
      BEGIN ALTER TABLE users ADD COLUMN is_email_verified BOOLEAN DEFAULT FALSE; EXCEPTION WHEN duplicate_column THEN NULL; END;
      BEGIN ALTER TABLE users ADD COLUMN is_phone_verified BOOLEAN DEFAULT FALSE; EXCEPTION WHEN duplicate_column THEN NULL; END;
      BEGIN ALTER TABLE users ADD COLUMN is_identity_verified BOOLEAN DEFAULT FALSE; EXCEPTION WHEN duplicate_column THEN NULL; END;
    END $$;
  `);

  // ============================================================
  // USER PREFERENCES TABLE
  // ============================================================
  await db.query(`
    CREATE TABLE IF NOT EXISTS user_preferences (
      user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
      preferred_zone TEXT,
      max_price DECIMAL(12,2),
      preferred_property_type TEXT,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    );
  `);

  // ============================================================
  // USER ACTIVITY TABLE
  // ============================================================
  await db.query(`
    CREATE TABLE IF NOT EXISTS user_activity (
      user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
      last_login TIMESTAMP,
      total_bookings INTEGER DEFAULT 0,
      total_reviews_written INTEGER DEFAULT 0,
      updated_at TIMESTAMP DEFAULT NOW()
    );
  `);

  // ============================================================
  // USER VERIFICATION DOCUMENTS TABLE
  // ============================================================
  await db.query(`
    CREATE TABLE IF NOT EXISTS user_verification_documents (
      id TEXT PRIMARY KEY,
      user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
      document_type TEXT,
      document_url TEXT,
      verification_status TEXT DEFAULT 'pending',
      created_at TIMESTAMP DEFAULT NOW()
    );
  `);

  // ============================================================
  // PROPERTIES TABLE
  // The existing DB uses camelCase column names, so we keep them
  // and ensure all needed columns exist.
  // ============================================================
  await db.query(`
    CREATE TABLE IF NOT EXISTS properties (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      location TEXT NOT NULL,
      price DECIMAL(12,2) NOT NULL DEFAULT 0,
      "hostId" TEXT,
      "hostName" TEXT DEFAULT 'Anfitrión',
      description TEXT,
      "imageUrl" TEXT,
      rating REAL DEFAULT 0,
      "reviewsCount" INTEGER DEFAULT 0,
      "identityValidated" INTEGER DEFAULT 0,
      "locationVerified" INTEGER DEFAULT 0,
      "videoValidated" INTEGER DEFAULT 0,
      "traceabilityLevel" TEXT DEFAULT 'low',
      "maxGuests" INTEGER DEFAULT 4,
      "hasPresencialVerification" INTEGER DEFAULT 0,
      "hasDigitalVerification" INTEGER DEFAULT 0,
      lat DOUBLE PRECISION DEFAULT -36.3536,
      lng DOUBLE PRECISION DEFAULT -56.7196,
      status TEXT DEFAULT 'active',
      is_verified_property BOOLEAN DEFAULT FALSE,
      bedrooms INTEGER DEFAULT 1,
      bathrooms INTEGER DEFAULT 1,
      property_type TEXT DEFAULT 'house',
      created_at TIMESTAMP DEFAULT NOW()
    );
  `);

  // Add lat/lng columns if they don't exist yet
  await db.query(`
    DO $$ BEGIN
      BEGIN ALTER TABLE properties ADD COLUMN lat DOUBLE PRECISION DEFAULT -36.3536; EXCEPTION WHEN duplicate_column THEN NULL; END;
      BEGIN ALTER TABLE properties ADD COLUMN lng DOUBLE PRECISION DEFAULT -56.7196; EXCEPTION WHEN duplicate_column THEN NULL; END;
      BEGIN ALTER TABLE properties ADD COLUMN status TEXT DEFAULT 'active'; EXCEPTION WHEN duplicate_column THEN NULL; END;
      BEGIN ALTER TABLE properties ADD COLUMN is_verified_property BOOLEAN DEFAULT FALSE; EXCEPTION WHEN duplicate_column THEN NULL; END;
      BEGIN ALTER TABLE properties ADD COLUMN bedrooms INTEGER DEFAULT 1; EXCEPTION WHEN duplicate_column THEN NULL; END;
      BEGIN ALTER TABLE properties ADD COLUMN bathrooms INTEGER DEFAULT 1; EXCEPTION WHEN duplicate_column THEN NULL; END;
      BEGIN ALTER TABLE properties ADD COLUMN property_type TEXT DEFAULT 'house'; EXCEPTION WHEN duplicate_column THEN NULL; END;
      BEGIN ALTER TABLE properties ADD COLUMN manual_blocked_dates TEXT DEFAULT '[]'; EXCEPTION WHEN duplicate_column THEN NULL; END;
    END $$;
  `);

  // ============================================================
  // BOOKINGS TABLE
  // The existing DB has: id, propertyId, userId, status, date, stay_code, verified
  // We work with this schema as-is and add missing columns safely.
  // ============================================================
  await db.query(`
    CREATE TABLE IF NOT EXISTS bookings (
      id TEXT PRIMARY KEY,
      "propertyId" TEXT REFERENCES properties(id),
      "userId" TEXT REFERENCES users(id),
      status TEXT DEFAULT 'pending',
      start_date DATE NOT NULL,
      end_date DATE NOT NULL,
      total_price DECIMAL(12,2),
      guests INTEGER DEFAULT 1,
      date TEXT,
      stay_code TEXT,
      verified INTEGER DEFAULT 0,
      created_at TIMESTAMP DEFAULT NOW()
    );
  `);

  // Safety migration for missing verified column on bookings
  await db.query(`
    DO $$ BEGIN
      BEGIN ALTER TABLE bookings ADD COLUMN verified INTEGER DEFAULT 0; EXCEPTION WHEN duplicate_column THEN NULL; END;
      BEGIN ALTER TABLE bookings ADD COLUMN start_date DATE; EXCEPTION WHEN duplicate_column THEN NULL; END;
      BEGIN ALTER TABLE bookings ADD COLUMN end_date DATE; EXCEPTION WHEN duplicate_column THEN NULL; END;
      BEGIN ALTER TABLE bookings ADD COLUMN total_price DECIMAL(12,2); EXCEPTION WHEN duplicate_column THEN NULL; END;
      BEGIN ALTER TABLE bookings ADD COLUMN guests INTEGER DEFAULT 1; EXCEPTION WHEN duplicate_column THEN NULL; END;
      BEGIN ALTER TABLE bookings ADD COLUMN created_at TIMESTAMP DEFAULT NOW(); EXCEPTION WHEN duplicate_column THEN NULL; END;
      BEGIN ALTER TABLE bookings ADD COLUMN contract_accepted BOOLEAN DEFAULT FALSE; EXCEPTION WHEN duplicate_column THEN NULL; END;
      BEGIN ALTER TABLE bookings ADD COLUMN contract_json TEXT; EXCEPTION WHEN duplicate_column THEN NULL; END;
    END $$;
  `);

  await db.query(`
    CREATE INDEX IF NOT EXISTS bookings_property_date_lookup_idx
      ON bookings ("propertyId", start_date, end_date, status);
  `);

  await db.query(`
    CREATE INDEX IF NOT EXISTS bookings_user_created_at_idx
      ON bookings ("userId", created_at);
  `);

  // ============================================================
  // CHAT SYSTEM (CONVERSATIONS & MESSAGES)
  // ============================================================
  await db.query(`
    CREATE TABLE IF NOT EXISTS conversations (
      id TEXT PRIMARY KEY,
      property_id TEXT REFERENCES properties(id),
      booking_id TEXT REFERENCES bookings(id),
      tenant_id TEXT REFERENCES users(id),
      host_id TEXT REFERENCES users(id),
      last_message TEXT,
      updated_at TIMESTAMP DEFAULT NOW(),
      created_at TIMESTAMP DEFAULT NOW()
    );
  `);

  await db.query(`
    CREATE TABLE IF NOT EXISTS messages (
      id TEXT PRIMARY KEY,
      conversation_id TEXT REFERENCES conversations(id) ON DELETE CASCADE,
      sender_id TEXT REFERENCES users(id),
      receiver_id TEXT REFERENCES users(id),
      content TEXT NOT NULL,
      is_system BOOLEAN DEFAULT FALSE,
      is_suspicious BOOLEAN DEFAULT FALSE,
      created_at TIMESTAMP DEFAULT NOW()
    );
  `);

  // ============================================================
  // USER BLOCKS TABLE
  // ============================================================
  await db.query(`
    CREATE TABLE IF NOT EXISTS user_blocks (
      id TEXT PRIMARY KEY,
      blocked_user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
      blocked_by_user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
      reason TEXT,
      created_at TIMESTAMP DEFAULT NOW()
    );
  `);

  // ============================================================
  // REVIEWS TABLE
  // ============================================================
  await db.query(`
    CREATE TABLE IF NOT EXISTS reviews (
      id TEXT PRIMARY KEY,
      booking_id TEXT,
      reviewer_id TEXT,
      reviewed_user_id TEXT,
      property_id TEXT,
      rating INTEGER CHECK (rating >= 1 AND rating <= 5),
      comment TEXT,
      type TEXT CHECK (type IN ('host_to_guest', 'guest_to_host')),
      photos_match_reality BOOLEAN DEFAULT TRUE,
      pressure_to_book_fast BOOLEAN DEFAULT FALSE,
      created_at TIMESTAMP DEFAULT NOW()
    );
  `);

  // ============================================================
  // REPORTS TABLE
  // ============================================================
  await db.query(`
    CREATE TABLE IF NOT EXISTS reports (
      id TEXT PRIMARY KEY,
      reported_user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
      reported_by_user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
      reason TEXT,
      description TEXT,
      status TEXT DEFAULT 'pending',
      created_at TIMESTAMP DEFAULT NOW()
    );
  `);

  // ============================================================
  // USER ACTIVITY LOGS TABLE
  // ============================================================
  await db.query(`
    CREATE TABLE IF NOT EXISTS user_activity_logs (
      id TEXT PRIMARY KEY,
      user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
      action TEXT,
      metadata JSONB,
      ip_address TEXT,
      created_at TIMESTAMP DEFAULT NOW()
    );
  `);

  // ============================================================
  // LEADS TABLE (for contact monetization)
  // ============================================================
  await db.query(`
    CREATE TABLE IF NOT EXISTS leads (
      id TEXT PRIMARY KEY,
      property_id TEXT REFERENCES properties(id) ON DELETE CASCADE,
      user_id TEXT REFERENCES users(id),
      contact_info JSONB,
      message TEXT,
      source TEXT,
      created_at TIMESTAMP DEFAULT NOW()
    );
  `);

  // ============================================================
  // FAVORITES TABLE (user <> property)
  // ============================================================
  await db.query(`
    CREATE TABLE IF NOT EXISTS favorites (
      user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
      property_id TEXT REFERENCES properties(id) ON DELETE CASCADE,
      created_at TIMESTAMP DEFAULT NOW(),
      PRIMARY KEY (user_id, property_id)
    );
  `);

  // ============================================================
  // SESSION TABLE (for connect-pg-simple)
  // ============================================================
  await db.query(`
    CREATE TABLE IF NOT EXISTS session (
      sid varchar NOT NULL COLLATE "default" PRIMARY KEY,
      sess json NOT NULL,
      expire timestamp(6) NOT NULL
    );
    CREATE INDEX IF NOT EXISTS "IDX_session_expire" ON session ("expire");
  `);

  // ============================================================
  // SEED PROPERTIES (if none exist)
  // ============================================================
  const { rows } = await db.query('SELECT COUNT(*) as count FROM properties');
  if (parseInt(rows[0].count) === 0) {
    await db.query(`
      INSERT INTO properties (id, title, location, price, "hostName", description, "imageUrl", rating, "reviewsCount", "identityValidated", "locationVerified", "traceabilityLevel", lat, lng)
      VALUES
        ('prop_1', 'Casa con pileta a 3 cuadras del mar', 'San Clemente del Tuyú', 18000, 'Carlos Pereira', 'Amplia casa con pileta, jardín y quincho. A 3 cuadras de la playa principal.', 'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=800', 4.5, 12, 1, 1, 'high', -36.3536, -56.7196),
        ('prop_2', 'Departamento frente al mar', 'San Clemente del Tuyú', 12000, 'Ana Torres', 'Moderno departamento con vista al mar, cocina equipada y balcón privado.', 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=800', 4.2, 8, 1, 0, 'medium', -36.3656, -56.7256),
        ('prop_3', 'Cabaña familiar con jardín', 'San Clemente del Tuyú', 9500, 'Marcos Ruiz', 'Cabaña acogedora a 5 cuadras del mar. Ideal para familias con niños.', 'https://images.unsplash.com/photo-1449824913935-59a10b8d2000?w=800', 3.9, 5, 0, 0, 'low', -36.3450, -56.7100)
    `);
    console.log('Seed properties created');
  }
};
