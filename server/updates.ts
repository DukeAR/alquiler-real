import bcrypt from 'bcrypt';
import { db } from './config/db';
import { buildDemoData } from './demoData';

type QueryRunner = {
  query: (text: string, params?: any[]) => Promise<{ rows: any[]; rowCount?: number }>;
};

const LEGACY_PROPERTY_IDS = ['prop_1', 'prop_2', 'prop_3'];

const recalculateDerivedMetrics = async (runner: QueryRunner) => {
  await runner.query(`
    UPDATE properties
    SET rating = 0,
        "reviewsCount" = 0;
  `);

  await runner.query(`
    UPDATE properties p
    SET "hostName" = COALESCE(u.name, p."hostName")
    FROM users u
    WHERE p."hostId" = u.id;
  `);

  await runner.query(`
    UPDATE properties p
    SET rating = stats.avg_rating,
        "reviewsCount" = stats.review_count
    FROM (
      SELECT property_id,
             ROUND(AVG(rating)::numeric, 1) as avg_rating,
             COUNT(*)::int as review_count
      FROM reviews
      WHERE type = 'guest_to_host'
        AND property_id IS NOT NULL
      GROUP BY property_id
    ) stats
    WHERE p.id = stats.property_id;
  `);

  await runner.query(`
    UPDATE users
    SET rating = 0,
        host_rating = 0,
        total_reviews = 0,
        total_properties = 0,
        total_bookings_hosted = 0;
  `);

  await runner.query(`
    UPDATE users u
    SET total_reviews = stats.total_reviews
    FROM (
      SELECT reviewed_user_id as user_id,
             COUNT(*)::int as total_reviews
      FROM reviews
      WHERE reviewed_user_id IS NOT NULL
      GROUP BY reviewed_user_id
    ) stats
    WHERE u.id = stats.user_id;
  `);

  await runner.query(`
    UPDATE users u
    SET rating = stats.avg_rating
    FROM (
      SELECT reviewed_user_id as user_id,
             ROUND(AVG(rating)::numeric, 1) as avg_rating
      FROM reviews
      WHERE type = 'host_to_guest'
      GROUP BY reviewed_user_id
    ) stats
    WHERE u.id = stats.user_id;
  `);

  await runner.query(`
    UPDATE users u
    SET host_rating = stats.avg_rating
    FROM (
      SELECT reviewed_user_id as user_id,
             ROUND(AVG(rating)::numeric, 1) as avg_rating
      FROM reviews
      WHERE type = 'guest_to_host'
      GROUP BY reviewed_user_id
    ) stats
    WHERE u.id = stats.user_id;
  `);

  await runner.query(`
    UPDATE users u
    SET total_properties = stats.total_properties
    FROM (
      SELECT "hostId" as host_id,
             COUNT(*)::int as total_properties
      FROM properties
      WHERE "hostId" IS NOT NULL
      GROUP BY "hostId"
    ) stats
    WHERE u.id = stats.host_id;
  `);

  await runner.query(`
    UPDATE users u
    SET total_bookings_hosted = stats.total_bookings_hosted
    FROM (
      SELECT p."hostId" as host_id,
             COUNT(*)::int as total_bookings_hosted
      FROM bookings b
      JOIN properties p ON p.id = b."propertyId"
      WHERE p."hostId" IS NOT NULL
        AND b.status <> 'cancelled'
      GROUP BY p."hostId"
    ) stats
    WHERE u.id = stats.host_id;
  `);

  await runner.query(`
    UPDATE users
    SET is_host = role = 'host',
        host_verified = CASE
          WHEN role = 'host' THEN COALESCE(is_identity_verified, FALSE) OR COALESCE(identity_validated, FALSE)
          ELSE host_verified
        END,
        trust_score = LEAST(
          100,
          GREATEST(
            0,
            (CASE WHEN COALESCE(email_verified, FALSE) OR COALESCE(is_email_verified, FALSE) THEN 18 ELSE 0 END) +
            (CASE WHEN COALESCE(phone_verified, FALSE) OR COALESCE(is_phone_verified, FALSE) THEN 12 ELSE 0 END) +
            (CASE WHEN COALESCE(identity_validated, FALSE) OR COALESCE(is_identity_verified, FALSE) THEN 28 ELSE 0 END) +
            LEAST(COALESCE(total_reviews, 0) * 5, 20) +
            LEAST(COALESCE(total_properties, 0) * 4, 12) +
            ROUND((CASE WHEN role = 'host' THEN COALESCE(host_rating, 0) ELSE COALESCE(rating, 0) END) * 5) -
            LEAST(COALESCE(risk_score, 0), 20)
          )
        ),
        badge = CASE
          WHEN role = 'host' AND COALESCE(host_rating, 0) >= 4.7 AND COALESCE(total_properties, 0) >= 3 THEN 'Anfitrion destacado'
          WHEN role = 'tenant' AND COALESCE(rating, 0) >= 4.5 AND COALESCE(total_reviews, 0) >= 2 THEN 'Huesped confiable'
          WHEN COALESCE(identity_validated, FALSE) OR COALESCE(is_identity_verified, FALSE) THEN 'Perfil verificado'
          ELSE 'Nuevo usuario'
        END;
  `);

  await runner.query(`
    UPDATE user_activity ua
    SET total_bookings = stats.total_bookings,
        total_reviews_written = stats.total_reviews_written,
        updated_at = NOW()
    FROM (
      SELECT u.id as user_id,
             COALESCE(bookings.total_bookings, 0) as total_bookings,
             COALESCE(reviews.total_reviews_written, 0) as total_reviews_written
      FROM users u
      LEFT JOIN (
        SELECT "userId" as user_id,
               COUNT(*)::int as total_bookings
        FROM bookings
        GROUP BY "userId"
      ) bookings ON bookings.user_id = u.id
      LEFT JOIN (
        SELECT reviewer_id as user_id,
               COUNT(*)::int as total_reviews_written
        FROM reviews
        GROUP BY reviewer_id
      ) reviews ON reviews.user_id = u.id
    ) stats
    WHERE ua.user_id = stats.user_id;
  `);
};

const seedDemoCatalog = async () => {
  const demoData = buildDemoData();
  const passwordHashes = new Map<string, string>();

  for (const user of demoData.users) {
    passwordHashes.set(user.id, await bcrypt.hash(user.password, 10));
  }

  const client = await db.getClient();

  try {
    await client.query('BEGIN');

    await client.query(`DELETE FROM messages WHERE conversation_id IN (SELECT id FROM conversations WHERE property_id = ANY($1::text[]))`, [LEGACY_PROPERTY_IDS]);
    await client.query(`DELETE FROM conversations WHERE property_id = ANY($1::text[])`, [LEGACY_PROPERTY_IDS]);
    await client.query(`DELETE FROM favorites WHERE property_id = ANY($1::text[])`, [LEGACY_PROPERTY_IDS]);
    await client.query(`DELETE FROM leads WHERE property_id = ANY($1::text[])`, [LEGACY_PROPERTY_IDS]);
    await client.query(`DELETE FROM reviews WHERE property_id = ANY($1::text[])`, [LEGACY_PROPERTY_IDS]);
    await client.query(`DELETE FROM bookings WHERE "propertyId" = ANY($1::text[])`, [LEGACY_PROPERTY_IDS]);
    await client.query(`DELETE FROM properties WHERE id = ANY($1::text[])`, [LEGACY_PROPERTY_IDS]);

    for (const user of demoData.users) {
      await client.query(
        `INSERT INTO users (
          id, email, password_hash, role, name, zone, phone, bio, interests,
          member_since, created_at, identity_validated, email_verified, phone_verified,
          validation_level, active_mode, profile_photo, rating, total_reviews, is_host, host_verified,
          host_rating, total_properties, total_bookings_hosted, badge, trust_score, risk_score,
          is_email_verified, is_phone_verified, is_identity_verified,
          identity_verification_status, identity_verification_provider, identity_verified_at
        )
        VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9,
          $10, $11, $12, $13, $14,
          $15, $16, $17, 0, 0, $18, $19,
          0, 0, 0, $20, $21, $22,
          $23, $24, $25,
          $26, $27, $28
        )
        ON CONFLICT (id) DO UPDATE SET
          email = EXCLUDED.email,
          password_hash = EXCLUDED.password_hash,
          role = EXCLUDED.role,
          name = EXCLUDED.name,
          zone = EXCLUDED.zone,
          phone = EXCLUDED.phone,
          bio = EXCLUDED.bio,
          interests = EXCLUDED.interests,
          member_since = EXCLUDED.member_since,
          created_at = EXCLUDED.created_at,
          identity_validated = EXCLUDED.identity_validated,
          email_verified = EXCLUDED.email_verified,
          phone_verified = EXCLUDED.phone_verified,
          validation_level = EXCLUDED.validation_level,
          active_mode = EXCLUDED.active_mode,
          profile_photo = EXCLUDED.profile_photo,
          is_host = EXCLUDED.is_host,
          host_verified = EXCLUDED.host_verified,
          badge = EXCLUDED.badge,
          trust_score = EXCLUDED.trust_score,
          risk_score = EXCLUDED.risk_score,
          is_email_verified = EXCLUDED.is_email_verified,
          is_phone_verified = EXCLUDED.is_phone_verified,
          is_identity_verified = EXCLUDED.is_identity_verified,
          identity_verification_status = EXCLUDED.identity_verification_status,
          identity_verification_provider = EXCLUDED.identity_verification_provider,
          identity_verified_at = EXCLUDED.identity_verified_at`,
        [
          user.id,
          user.email,
          passwordHashes.get(user.id) ?? '',
          user.role,
          user.name,
          user.zone,
          user.phone,
          user.bio,
          JSON.stringify(user.interests),
          user.memberSince,
          user.createdAt,
          user.identityValidated,
          user.emailVerified,
          user.phoneVerified,
          user.validationLevel,
          user.role === 'host' ? 'host' : 'guest',
          user.profilePhoto,
          user.role === 'host',
          user.role === 'host' && user.identityValidated,
          user.badge,
          user.trustScore,
          user.riskScore,
          user.emailVerified,
          user.phoneVerified,
          user.identityValidated,
          user.identityVerificationStatus ?? (user.identityValidated ? 'verified' : 'unverified'),
          user.identityVerificationProvider ?? null,
          user.identityVerifiedAt ?? null,
        ],
      );
    }

    for (const preference of demoData.userPreferences) {
      await client.query(
        `INSERT INTO user_preferences (user_id, preferred_zone, max_price, preferred_property_type, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT (user_id) DO UPDATE SET
           preferred_zone = EXCLUDED.preferred_zone,
           max_price = EXCLUDED.max_price,
           preferred_property_type = EXCLUDED.preferred_property_type,
           created_at = EXCLUDED.created_at,
           updated_at = EXCLUDED.updated_at`,
        [
          preference.userId,
          preference.preferredZone,
          preference.maxPrice,
          preference.preferredPropertyType,
          preference.createdAt,
          preference.updatedAt,
        ],
      );
    }

    for (const activity of demoData.userActivity) {
      await client.query(
        `INSERT INTO user_activity (user_id, last_login, total_bookings, total_reviews_written, updated_at)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (user_id) DO UPDATE SET
           last_login = EXCLUDED.last_login,
           total_bookings = EXCLUDED.total_bookings,
           total_reviews_written = EXCLUDED.total_reviews_written,
           updated_at = EXCLUDED.updated_at`,
        [activity.userId, activity.lastLogin, activity.totalBookings, activity.totalReviewsWritten, activity.updatedAt],
      );
    }

    for (const property of demoData.properties) {
      await client.query(
        `INSERT INTO properties (
          id, title, location, price, "hostId", "hostName", description, "imageUrl",
          rating, "reviewsCount", "identityValidated", "locationVerified", "materialVerified", "videoValidated",
          "traceabilityLevel", "maxGuests", "hasPresencialVerification", "onsiteVerifiedAt", "hasDigitalVerification",
          lat, lng, status, is_verified_property, bedrooms, bathrooms, property_type, created_at, manual_blocked_dates
        )
        VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8,
          0, 0, $9, $10, $11, $12,
          $13, $14, $15, $16, $17,
          $18, $19, $20, $21, $22, $23, $24, $25, $26
        )
        ON CONFLICT (id) DO UPDATE SET
          title = EXCLUDED.title,
          location = EXCLUDED.location,
          price = EXCLUDED.price,
          "hostId" = EXCLUDED."hostId",
          "hostName" = EXCLUDED."hostName",
          description = EXCLUDED.description,
          "imageUrl" = EXCLUDED."imageUrl",
          "identityValidated" = EXCLUDED."identityValidated",
          "locationVerified" = EXCLUDED."locationVerified",
          "materialVerified" = EXCLUDED."materialVerified",
          "videoValidated" = EXCLUDED."videoValidated",
          "traceabilityLevel" = EXCLUDED."traceabilityLevel",
          "maxGuests" = EXCLUDED."maxGuests",
          "hasPresencialVerification" = EXCLUDED."hasPresencialVerification",
          "onsiteVerifiedAt" = EXCLUDED."onsiteVerifiedAt",
          "hasDigitalVerification" = EXCLUDED."hasDigitalVerification",
          lat = EXCLUDED.lat,
          lng = EXCLUDED.lng,
          status = EXCLUDED.status,
          is_verified_property = EXCLUDED.is_verified_property,
          bedrooms = EXCLUDED.bedrooms,
          bathrooms = EXCLUDED.bathrooms,
          property_type = EXCLUDED.property_type,
          created_at = EXCLUDED.created_at,
          manual_blocked_dates = EXCLUDED.manual_blocked_dates`,
        [
          property.id,
          property.title,
          property.location,
          property.price,
          property.hostId,
          property.hostName,
          property.description,
          property.imageUrl,
          property.identityValidated ? 1 : 0,
          property.locationVerified ? 1 : 0,
          (property.materialVerified ?? property.videoValidated) ? 1 : 0,
          property.videoValidated ? 1 : 0,
          property.traceabilityLevel,
          property.maxGuests,
          property.hasPresencialVerification ? 1 : 0,
          property.onsiteVerifiedAt ?? null,
          property.hasDigitalVerification ? 1 : 0,
          property.lat,
          property.lng,
          property.status,
          property.isVerifiedProperty,
          property.bedrooms,
          property.bathrooms,
          property.propertyType,
          property.createdAt,
          JSON.stringify(property.manualBlockedDates),
        ],
      );
    }

    for (const booking of demoData.bookings) {
      await client.query(
        `INSERT INTO bookings (
          id, "propertyId", "userId", status, start_date, end_date,
          total_price, guests, date, stay_code, verified, created_at,
          contract_accepted, contract_json
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
        ON CONFLICT (id) DO UPDATE SET
          "propertyId" = EXCLUDED."propertyId",
          "userId" = EXCLUDED."userId",
          status = EXCLUDED.status,
          start_date = EXCLUDED.start_date,
          end_date = EXCLUDED.end_date,
          total_price = EXCLUDED.total_price,
          guests = EXCLUDED.guests,
          date = EXCLUDED.date,
          stay_code = EXCLUDED.stay_code,
          verified = EXCLUDED.verified,
          created_at = EXCLUDED.created_at,
          contract_accepted = EXCLUDED.contract_accepted,
          contract_json = EXCLUDED.contract_json`,
        [
          booking.id,
          booking.propertyId,
          booking.userId,
          booking.status,
          booking.startDate,
          booking.endDate,
          booking.totalPrice,
          booking.guests,
          booking.date,
          booking.stayCode,
          booking.verified,
          booking.createdAt,
          booking.contractAccepted,
          booking.contractJson,
        ],
      );
    }

    for (const review of demoData.reviews) {
      await client.query(
        `INSERT INTO reviews (
          id, booking_id, reviewer_id, reviewed_user_id, property_id,
            rating, comment, type, agreement_kept, would_interact_again, had_incident,
            photos_match_reality, pressure_to_book_fast, created_at
        )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
        ON CONFLICT (id) DO UPDATE SET
          booking_id = EXCLUDED.booking_id,
          reviewer_id = EXCLUDED.reviewer_id,
          reviewed_user_id = EXCLUDED.reviewed_user_id,
          property_id = EXCLUDED.property_id,
          rating = EXCLUDED.rating,
          comment = EXCLUDED.comment,
          type = EXCLUDED.type,
            agreement_kept = EXCLUDED.agreement_kept,
            would_interact_again = EXCLUDED.would_interact_again,
            had_incident = EXCLUDED.had_incident,
          photos_match_reality = EXCLUDED.photos_match_reality,
          pressure_to_book_fast = EXCLUDED.pressure_to_book_fast,
          created_at = EXCLUDED.created_at`,
        [
          review.id,
          review.bookingId,
          review.reviewerId,
          review.reviewedUserId,
          review.propertyId,
          review.rating,
          review.comment,
          review.type,
          review.agreementKept,
          review.wouldInteractAgain,
          review.hadIncident,
          review.photosMatchReality,
          review.pressureToBookFast,
          review.createdAt,
        ],
      );
    }

    for (const conversation of demoData.conversations) {
      await client.query(
        `INSERT INTO conversations (id, property_id, booking_id, tenant_id, host_id, last_message, updated_at, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         ON CONFLICT (id) DO UPDATE SET
           property_id = EXCLUDED.property_id,
           booking_id = EXCLUDED.booking_id,
           tenant_id = EXCLUDED.tenant_id,
           host_id = EXCLUDED.host_id,
           last_message = EXCLUDED.last_message,
           updated_at = EXCLUDED.updated_at,
           created_at = EXCLUDED.created_at`,
        [
          conversation.id,
          conversation.propertyId,
          conversation.bookingId || null,
          conversation.tenantId,
          conversation.hostId,
          conversation.lastMessage,
          conversation.updatedAt,
          conversation.createdAt,
        ],
      );
    }

    for (const message of demoData.messages) {
      await client.query(
        `INSERT INTO messages (id, conversation_id, sender_id, receiver_id, content, is_system, is_suspicious, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         ON CONFLICT (id) DO UPDATE SET
           conversation_id = EXCLUDED.conversation_id,
           sender_id = EXCLUDED.sender_id,
           receiver_id = EXCLUDED.receiver_id,
           content = EXCLUDED.content,
           is_system = EXCLUDED.is_system,
           is_suspicious = EXCLUDED.is_suspicious,
           created_at = EXCLUDED.created_at`,
        [message.id, message.conversationId, message.senderId, message.receiverId, message.content, message.isSystem, message.isSuspicious, message.createdAt],
      );
    }

    for (const favorite of demoData.favorites) {
      await client.query(
        `INSERT INTO favorites (user_id, property_id, created_at)
         VALUES ($1, $2, $3)
         ON CONFLICT (user_id, property_id) DO UPDATE SET
           created_at = EXCLUDED.created_at`,
        [favorite.userId, favorite.propertyId, favorite.createdAt],
      );
    }

    await recalculateDerivedMetrics(client);
    await client.query('COMMIT');
    console.log('Demo data synced');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

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
      active_mode TEXT CHECK (active_mode IN ('guest', 'host')) NOT NULL DEFAULT 'guest',
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
      is_identity_verified BOOLEAN DEFAULT FALSE,
      identity_verification_status TEXT DEFAULT 'unverified',
      identity_verification_provider TEXT,
      identity_verified_at TIMESTAMP
    );
  `);

  // Safety migrations for missing columns on users table
  await db.query(`
    DO $$ BEGIN
      BEGIN ALTER TABLE users ADD COLUMN password_hash TEXT DEFAULT ''; EXCEPTION WHEN duplicate_column THEN NULL; END;
      BEGIN ALTER TABLE users ADD COLUMN zone TEXT; EXCEPTION WHEN duplicate_column THEN NULL; END;
      BEGIN ALTER TABLE users ADD COLUMN role TEXT DEFAULT 'tenant'; EXCEPTION WHEN duplicate_column THEN NULL; END;
      BEGIN ALTER TABLE users ADD COLUMN active_mode TEXT DEFAULT 'guest'; EXCEPTION WHEN duplicate_column THEN NULL; END;
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
      BEGIN ALTER TABLE users ADD COLUMN internal_trust_score INTEGER DEFAULT 100; EXCEPTION WHEN duplicate_column THEN NULL; END;
      BEGIN ALTER TABLE users ADD COLUMN internal_risk_flags JSONB DEFAULT '[]'::jsonb; EXCEPTION WHEN duplicate_column THEN NULL; END;
      BEGIN ALTER TABLE users ADD COLUMN internal_behavior_signals JSONB DEFAULT '[]'::jsonb; EXCEPTION WHEN duplicate_column THEN NULL; END;
      BEGIN ALTER TABLE users ADD COLUMN internal_risk_level TEXT DEFAULT 'none'; EXCEPTION WHEN duplicate_column THEN NULL; END;
      BEGIN ALTER TABLE users ADD COLUMN internal_visibility_penalty INTEGER DEFAULT 0; EXCEPTION WHEN duplicate_column THEN NULL; END;
      BEGIN ALTER TABLE users ADD COLUMN internal_requires_additional_verification BOOLEAN DEFAULT FALSE; EXCEPTION WHEN duplicate_column THEN NULL; END;
      BEGIN ALTER TABLE users ADD COLUMN internal_action_limited BOOLEAN DEFAULT FALSE; EXCEPTION WHEN duplicate_column THEN NULL; END;
      BEGIN ALTER TABLE users ADD COLUMN internal_manual_review_required BOOLEAN DEFAULT FALSE; EXCEPTION WHEN duplicate_column THEN NULL; END;
      BEGIN ALTER TABLE users ADD COLUMN internal_risk_updated_at TIMESTAMP; EXCEPTION WHEN duplicate_column THEN NULL; END;
      BEGIN ALTER TABLE users ADD COLUMN is_email_verified BOOLEAN DEFAULT FALSE; EXCEPTION WHEN duplicate_column THEN NULL; END;
      BEGIN ALTER TABLE users ADD COLUMN is_phone_verified BOOLEAN DEFAULT FALSE; EXCEPTION WHEN duplicate_column THEN NULL; END;
      BEGIN ALTER TABLE users ADD COLUMN is_identity_verified BOOLEAN DEFAULT FALSE; EXCEPTION WHEN duplicate_column THEN NULL; END;
      BEGIN ALTER TABLE users ADD COLUMN identity_verification_status TEXT DEFAULT 'unverified'; EXCEPTION WHEN duplicate_column THEN NULL; END;
      BEGIN ALTER TABLE users ADD COLUMN identity_verification_provider TEXT; EXCEPTION WHEN duplicate_column THEN NULL; END;
      BEGIN ALTER TABLE users ADD COLUMN identity_verified_at TIMESTAMP; EXCEPTION WHEN duplicate_column THEN NULL; END;
    END $$;
  `);

  await db.query(`
    UPDATE users
    SET identity_verification_status = CASE
      WHEN COALESCE(identity_validated, FALSE) OR COALESCE(is_identity_verified, FALSE) THEN 'verified'
      ELSE 'unverified'
    END
    WHERE identity_verification_status IS NULL
       OR identity_verification_status NOT IN ('unverified', 'pending', 'verified', 'rejected');
  `);

  await db.query(`
    UPDATE users
    SET active_mode = CASE
      WHEN active_mode IN ('guest', 'host') THEN active_mode
      WHEN role = 'host' THEN 'host'
      ELSE 'guest'
    END;
  `);

  await db.query(`
    UPDATE users
    SET internal_trust_score = COALESCE(internal_trust_score, 100),
        internal_risk_flags = COALESCE(internal_risk_flags, '[]'::jsonb),
        internal_behavior_signals = COALESCE(internal_behavior_signals, '[]'::jsonb),
        internal_risk_level = COALESCE(NULLIF(internal_risk_level, ''), 'none'),
        internal_visibility_penalty = COALESCE(internal_visibility_penalty, 0),
        internal_requires_additional_verification = COALESCE(internal_requires_additional_verification, FALSE),
        internal_action_limited = COALESCE(internal_action_limited, FALSE),
        internal_manual_review_required = COALESCE(internal_manual_review_required, FALSE);
  `);

  await db.query(`
    CREATE INDEX IF NOT EXISTS idx_users_internal_visibility
      ON users (internal_manual_review_required, internal_visibility_penalty);
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

  await db.query(`
    CREATE TABLE IF NOT EXISTS verification_files (
      id TEXT PRIMARY KEY,
      storage_key TEXT NOT NULL UNIQUE,
      thumbnail_storage_key TEXT,
      file_url TEXT NOT NULL,
      thumbnail_url TEXT,
      file_type TEXT NOT NULL,
      visibility TEXT NOT NULL,
      verification_scope TEXT NOT NULL,
      verification_status TEXT NOT NULL DEFAULT 'uploaded',
      user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
      property_id TEXT REFERENCES properties(id) ON DELETE CASCADE,
      original_name TEXT,
      mime_type TEXT,
      size_bytes INTEGER NOT NULL DEFAULT 0,
      metadata JSONB DEFAULT '{}'::jsonb,
      created_at TIMESTAMP DEFAULT NOW()
    );
  `);

  await db.query(`
    CREATE INDEX IF NOT EXISTS verification_files_property_idx
      ON verification_files (property_id, verification_scope, created_at DESC);
  `);

  await db.query(`
    CREATE INDEX IF NOT EXISTS verification_files_user_idx
      ON verification_files (user_id, verification_scope, created_at DESC);
  `);

  await db.query(`
    CREATE INDEX IF NOT EXISTS verification_files_visibility_idx
      ON verification_files (visibility, file_type, created_at DESC);
  `);

  await db.query(`
    CREATE TABLE IF NOT EXISTS premium_verification_orders (
      id TEXT PRIMARY KEY,
      user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
      property_id TEXT REFERENCES properties(id) ON DELETE CASCADE,
      offer_type TEXT NOT NULL,
      target_type TEXT NOT NULL,
      price_ars INTEGER NOT NULL DEFAULT 0,
      currency TEXT NOT NULL DEFAULT 'ARS',
      payment_status TEXT NOT NULL DEFAULT 'pending',
      verification_status TEXT NOT NULL DEFAULT 'pending',
      is_promotional BOOLEAN NOT NULL DEFAULT FALSE,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW(),
      completed_at TIMESTAMP
    );
  `);

  await db.query(`
    DO $$ BEGIN
      BEGIN ALTER TABLE premium_verification_orders ADD COLUMN property_id TEXT REFERENCES properties(id) ON DELETE CASCADE; EXCEPTION WHEN duplicate_column THEN NULL; END;
      BEGIN ALTER TABLE premium_verification_orders ADD COLUMN offer_type TEXT DEFAULT 'documentary-user'; EXCEPTION WHEN duplicate_column THEN NULL; END;
      BEGIN ALTER TABLE premium_verification_orders ADD COLUMN target_type TEXT DEFAULT 'user'; EXCEPTION WHEN duplicate_column THEN NULL; END;
      BEGIN ALTER TABLE premium_verification_orders ADD COLUMN price_ars INTEGER DEFAULT 0; EXCEPTION WHEN duplicate_column THEN NULL; END;
      BEGIN ALTER TABLE premium_verification_orders ADD COLUMN currency TEXT DEFAULT 'ARS'; EXCEPTION WHEN duplicate_column THEN NULL; END;
      BEGIN ALTER TABLE premium_verification_orders ADD COLUMN payment_status TEXT DEFAULT 'pending'; EXCEPTION WHEN duplicate_column THEN NULL; END;
      BEGIN ALTER TABLE premium_verification_orders ADD COLUMN verification_status TEXT DEFAULT 'pending'; EXCEPTION WHEN duplicate_column THEN NULL; END;
      BEGIN ALTER TABLE premium_verification_orders ADD COLUMN is_promotional BOOLEAN DEFAULT FALSE; EXCEPTION WHEN duplicate_column THEN NULL; END;
      BEGIN ALTER TABLE premium_verification_orders ADD COLUMN updated_at TIMESTAMP DEFAULT NOW(); EXCEPTION WHEN duplicate_column THEN NULL; END;
      BEGIN ALTER TABLE premium_verification_orders ADD COLUMN completed_at TIMESTAMP; EXCEPTION WHEN duplicate_column THEN NULL; END;
    END $$;
  `);

  await db.query(`
    CREATE INDEX IF NOT EXISTS premium_verification_orders_user_offer_idx
      ON premium_verification_orders (user_id, offer_type, created_at DESC);
  `);

  await db.query(`
    CREATE INDEX IF NOT EXISTS premium_verification_orders_property_offer_idx
      ON premium_verification_orders (property_id, offer_type, created_at DESC);
  `);

  await db.query(`
    CREATE INDEX IF NOT EXISTS premium_verification_orders_promotional_offer_idx
      ON premium_verification_orders (offer_type, is_promotional, created_at DESC);
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
      images TEXT DEFAULT '[]',
      rating REAL DEFAULT 0,
      "reviewsCount" INTEGER DEFAULT 0,
      "identityValidated" INTEGER DEFAULT 0,
      "locationVerified" INTEGER DEFAULT 0,
      "materialVerified" INTEGER DEFAULT 0,
      "videoValidated" INTEGER DEFAULT 0,
      "traceabilityLevel" TEXT DEFAULT 'low',
      "maxGuests" INTEGER DEFAULT 4,
      beds INTEGER,
      "hasPresencialVerification" INTEGER DEFAULT 0,
      "onsiteVerifiedAt" TIMESTAMP,
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
      BEGIN ALTER TABLE properties ADD COLUMN images TEXT DEFAULT '[]'; EXCEPTION WHEN duplicate_column THEN NULL; END;
      BEGIN ALTER TABLE properties ADD COLUMN lat DOUBLE PRECISION DEFAULT -36.3536; EXCEPTION WHEN duplicate_column THEN NULL; END;
      BEGIN ALTER TABLE properties ADD COLUMN lng DOUBLE PRECISION DEFAULT -56.7196; EXCEPTION WHEN duplicate_column THEN NULL; END;
      BEGIN ALTER TABLE properties ADD COLUMN status TEXT DEFAULT 'active'; EXCEPTION WHEN duplicate_column THEN NULL; END;
      BEGIN ALTER TABLE properties ADD COLUMN is_verified_property BOOLEAN DEFAULT FALSE; EXCEPTION WHEN duplicate_column THEN NULL; END;
      BEGIN ALTER TABLE properties ADD COLUMN beds INTEGER; EXCEPTION WHEN duplicate_column THEN NULL; END;
      BEGIN ALTER TABLE properties ADD COLUMN bedrooms INTEGER DEFAULT 1; EXCEPTION WHEN duplicate_column THEN NULL; END;
      BEGIN ALTER TABLE properties ADD COLUMN bathrooms INTEGER DEFAULT 1; EXCEPTION WHEN duplicate_column THEN NULL; END;
      BEGIN ALTER TABLE properties ADD COLUMN property_type TEXT DEFAULT 'house'; EXCEPTION WHEN duplicate_column THEN NULL; END;
      BEGIN ALTER TABLE properties ADD COLUMN "materialVerified" INTEGER DEFAULT 0; EXCEPTION WHEN duplicate_column THEN NULL; END;
      BEGIN ALTER TABLE properties ADD COLUMN "onsiteVerifiedAt" TIMESTAMP; EXCEPTION WHEN duplicate_column THEN NULL; END;
      BEGIN ALTER TABLE properties ADD COLUMN manual_blocked_dates TEXT DEFAULT '[]'; EXCEPTION WHEN duplicate_column THEN NULL; END;
    END $$;
  `);

  await db.query(`
    UPDATE properties
    SET "materialVerified" = COALESCE("videoValidated", 0)
    WHERE COALESCE("materialVerified", 0) = 0
      AND COALESCE("videoValidated", 0) <> 0;
  `);

  await db.query(`
    UPDATE properties
    SET images = CASE
      WHEN COALESCE(TRIM(images), '') = '' AND COALESCE(TRIM("imageUrl"), '') <> '' THEN json_build_array("imageUrl")::text
      ELSE COALESCE(images, '[]')
    END
    WHERE images IS NULL OR TRIM(images) = '';
  `);

  await db.query(`
    UPDATE properties
    SET beds = COALESCE(beds, bedrooms)
    WHERE beds IS NULL AND bedrooms IS NOT NULL;
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
      BEGIN ALTER TABLE bookings ADD COLUMN request_mode TEXT DEFAULT 'direct'; EXCEPTION WHEN duplicate_column THEN NULL; END;
      BEGIN ALTER TABLE bookings ADD COLUMN deposit_type TEXT; EXCEPTION WHEN duplicate_column THEN NULL; END;
      BEGIN ALTER TABLE bookings ADD COLUMN deposit_status TEXT; EXCEPTION WHEN duplicate_column THEN NULL; END;
      BEGIN ALTER TABLE bookings ADD COLUMN deposit_amount_ars INTEGER; EXCEPTION WHEN duplicate_column THEN NULL; END;
      BEGIN ALTER TABLE bookings ADD COLUMN service_fee_ars INTEGER; EXCEPTION WHEN duplicate_column THEN NULL; END;
      BEGIN ALTER TABLE bookings ADD COLUMN deposit_total_charge_ars INTEGER; EXCEPTION WHEN duplicate_column THEN NULL; END;
      BEGIN ALTER TABLE bookings ADD COLUMN deposit_payment_reference TEXT; EXCEPTION WHEN duplicate_column THEN NULL; END;
      BEGIN ALTER TABLE bookings ADD COLUMN cancellation_actor TEXT; EXCEPTION WHEN duplicate_column THEN NULL; END;
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
      request_mode TEXT,
      request_status TEXT DEFAULT 'pending',
      request_created_at TIMESTAMP,
      deposit_status TEXT,
      request_start_date DATE,
      request_end_date DATE,
      request_guests INTEGER,
      request_total_price DECIMAL(12,2),
      last_message TEXT,
      updated_at TIMESTAMP DEFAULT NOW(),
      created_at TIMESTAMP DEFAULT NOW()
    );
  `);

  await db.query(`
    DO $$ BEGIN
      BEGIN ALTER TABLE conversations ADD COLUMN request_mode TEXT; EXCEPTION WHEN duplicate_column THEN NULL; END;
      BEGIN ALTER TABLE conversations ADD COLUMN request_status TEXT DEFAULT 'pending'; EXCEPTION WHEN duplicate_column THEN NULL; END;
      BEGIN ALTER TABLE conversations ADD COLUMN request_created_at TIMESTAMP; EXCEPTION WHEN duplicate_column THEN NULL; END;
      BEGIN ALTER TABLE conversations ADD COLUMN deposit_type TEXT; EXCEPTION WHEN duplicate_column THEN NULL; END;
      BEGIN ALTER TABLE conversations ADD COLUMN deposit_status TEXT; EXCEPTION WHEN duplicate_column THEN NULL; END;
      BEGIN ALTER TABLE conversations ADD COLUMN deposit_amount_ars INTEGER; EXCEPTION WHEN duplicate_column THEN NULL; END;
      BEGIN ALTER TABLE conversations ADD COLUMN service_fee_ars INTEGER; EXCEPTION WHEN duplicate_column THEN NULL; END;
      BEGIN ALTER TABLE conversations ADD COLUMN deposit_total_charge_ars INTEGER; EXCEPTION WHEN duplicate_column THEN NULL; END;
      BEGIN ALTER TABLE conversations ADD COLUMN deposit_payment_reference TEXT; EXCEPTION WHEN duplicate_column THEN NULL; END;
      BEGIN ALTER TABLE conversations ADD COLUMN request_start_date DATE; EXCEPTION WHEN duplicate_column THEN NULL; END;
      BEGIN ALTER TABLE conversations ADD COLUMN request_end_date DATE; EXCEPTION WHEN duplicate_column THEN NULL; END;
      BEGIN ALTER TABLE conversations ADD COLUMN request_guests INTEGER; EXCEPTION WHEN duplicate_column THEN NULL; END;
      BEGIN ALTER TABLE conversations ADD COLUMN request_total_price DECIMAL(12,2); EXCEPTION WHEN duplicate_column THEN NULL; END;
    END $$;
  `);

  await db.query(`
    CREATE TABLE IF NOT EXISTS messages (
      id TEXT PRIMARY KEY,
      conversation_id TEXT REFERENCES conversations(id) ON DELETE CASCADE,
      sender_id TEXT REFERENCES users(id),
      receiver_id TEXT REFERENCES users(id),
      content TEXT NOT NULL,
      is_system BOOLEAN DEFAULT FALSE,
      system_key TEXT,
      is_suspicious BOOLEAN DEFAULT FALSE,
      created_at TIMESTAMP DEFAULT NOW()
    );
  `);

  await db.query(`
    DO $$ BEGIN
      BEGIN ALTER TABLE messages ADD COLUMN conversation_id TEXT REFERENCES conversations(id) ON DELETE CASCADE; EXCEPTION WHEN duplicate_column THEN NULL; END;
    END $$;
  `);

  await db.query(`
    DO $$ BEGIN
      BEGIN ALTER TABLE messages ADD COLUMN system_key TEXT; EXCEPTION WHEN duplicate_column THEN NULL; END;
    END $$;
  `);

  await db.query(`
    CREATE UNIQUE INDEX IF NOT EXISTS messages_conversation_system_key_idx
    ON messages (conversation_id, system_key)
    WHERE system_key IS NOT NULL;
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
      agreement_kept BOOLEAN,
      would_interact_again BOOLEAN,
      had_incident BOOLEAN,
      photos_match_reality BOOLEAN DEFAULT TRUE,
      pressure_to_book_fast BOOLEAN DEFAULT FALSE,
      created_at TIMESTAMP DEFAULT NOW()
    );
  `);

  await db.query(`
    DO $$ BEGIN
      BEGIN ALTER TABLE reviews ADD COLUMN agreement_kept BOOLEAN; EXCEPTION WHEN duplicate_column THEN NULL; END;
      BEGIN ALTER TABLE reviews ADD COLUMN would_interact_again BOOLEAN; EXCEPTION WHEN duplicate_column THEN NULL; END;
      BEGIN ALTER TABLE reviews ADD COLUMN had_incident BOOLEAN; EXCEPTION WHEN duplicate_column THEN NULL; END;
    END $$;
  `);

  await db.query(`
    UPDATE reviews
    SET agreement_kept = COALESCE(
          agreement_kept,
          CASE
            WHEN photos_match_reality = FALSE OR pressure_to_book_fast = TRUE THEN FALSE
            WHEN rating IS NOT NULL THEN rating >= 4
            ELSE TRUE
          END
        ),
        would_interact_again = COALESCE(
          would_interact_again,
          CASE
            WHEN pressure_to_book_fast = TRUE OR photos_match_reality = FALSE THEN FALSE
            WHEN rating IS NOT NULL THEN rating >= 4
            ELSE TRUE
          END
        ),
        had_incident = COALESCE(
          had_incident,
          CASE
            WHEN pressure_to_book_fast = TRUE OR photos_match_reality = FALSE THEN TRUE
            WHEN rating IS NOT NULL THEN rating <= 3
            ELSE FALSE
          END
        )
    WHERE agreement_kept IS NULL
       OR would_interact_again IS NULL
       OR had_incident IS NULL;
  `);

  await db.query(`
    CREATE UNIQUE INDEX IF NOT EXISTS reviews_booking_reviewer_type_idx
    ON reviews (booking_id, reviewer_id, type);
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
      read_at TIMESTAMP,
      created_at TIMESTAMP DEFAULT NOW()
    );
  `);

  await db.query(`
    DO $$ BEGIN
      BEGIN ALTER TABLE user_activity_logs ADD COLUMN read_at TIMESTAMP; EXCEPTION WHEN duplicate_column THEN NULL; END;
    END $$;
  `);

  await db.query(`
    CREATE INDEX IF NOT EXISTS idx_user_activity_logs_user_created_at
      ON user_activity_logs (user_id, created_at DESC);
  `);

  await db.query(`
    CREATE INDEX IF NOT EXISTS idx_user_activity_logs_user_read_at
      ON user_activity_logs (user_id, read_at);
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

  await seedDemoCatalog();
};
