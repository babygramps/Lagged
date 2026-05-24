import {
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import type { AdapterAccountType } from "next-auth/adapters";

// Auth.js v5 tables — names must match @auth/drizzle-adapter defaults
export const users = pgTable("user", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  name: text("name"),
  email: text("email").notNull().unique(),
  emailVerified: timestamp("emailVerified", { mode: "date" }),
  image: text("image"),
});

export const accounts = pgTable(
  "account",
  {
    userId: text("userId")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: text("type").$type<AdapterAccountType>().notNull(),
    provider: text("provider").notNull(),
    providerAccountId: text("providerAccountId").notNull(),
    refresh_token: text("refresh_token"),
    access_token: text("access_token"),
    expires_at: integer("expires_at"),
    token_type: text("token_type"),
    scope: text("scope"),
    id_token: text("id_token"),
    session_state: text("session_state"),
  },
  (a) => ({ pk: primaryKey({ columns: [a.provider, a.providerAccountId] }) }),
);

export const sessions = pgTable("session", {
  sessionToken: text("sessionToken").primaryKey(),
  userId: text("userId")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  expires: timestamp("expires", { mode: "date" }).notNull(),
});

export const verificationTokens = pgTable(
  "verificationToken",
  {
    identifier: text("identifier").notNull(),
    token: text("token").notNull(),
    expires: timestamp("expires", { mode: "date" }).notNull(),
  },
  (vt) => ({ pk: primaryKey({ columns: [vt.identifier, vt.token] }) }),
);

// App enums
export const chronotypeEnum = pgEnum("chronotype", ["early", "neutral", "late"]);
export const tripDirectionEnum = pgEnum("trip_direction", ["east", "west", "none"]);
export const stepKindEnum = pgEnum("step_kind", [
  "light_seek",
  "light_avoid_start",
  "light_avoid_end",
  "melatonin_dose",
  "caffeine_cutoff",
  "sleep_window",
  "wake",
  "exercise_window",
  "watch_set",
  "mask_on",
  "mask_off",
]);

// App tables
export const profiles = pgTable("profile", {
  userId: text("user_id")
    .primaryKey()
    .references(() => users.id, { onDelete: "cascade" }),
  chronotype: chronotypeEnum("chronotype").notNull().default("neutral"),
  habitualBedtimeLocal: text("habitual_bedtime_local").notNull().default("23:00"),
  habitualWakeLocal: text("habitual_wake_local").notNull().default("07:00"),
  homeTz: text("home_tz").notNull().default("America/Los_Angeles"),
  ntfyTopic: text("ntfy_topic"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const trips = pgTable(
  "trip",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    label: text("label").notNull(),
    originTz: text("origin_tz").notNull(),
    destTz: text("dest_tz").notNull(),
    departAt: timestamp("depart_at", { withTimezone: true }).notNull(),
    arriveAt: timestamp("arrive_at", { withTimezone: true }).notNull(),
    returnDepartAt: timestamp("return_depart_at", { withTimezone: true }),
    returnArriveAt: timestamp("return_arrive_at", { withTimezone: true }),
    direction: tripDirectionEnum("direction").notNull(),
    shiftHours: integer("shift_hours").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({ byUser: index("trip_user_idx").on(t.userId) }),
);

export const protocols = pgTable("protocol", {
  id: uuid("id").primaryKey().defaultRandom(),
  tripId: uuid("trip_id")
    .notNull()
    .references(() => trips.id, { onDelete: "cascade" })
    .unique(),
  engineVersion: text("engine_version").notNull(),
  plan: jsonb("plan").notNull(),
  baselineCbtMinUtc: timestamp("baseline_cbt_min_utc", { withTimezone: true }).notNull(),
  baselineDlmoUtc: timestamp("baseline_dlmo_utc", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const steps = pgTable(
  "step",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    protocolId: uuid("protocol_id")
      .notNull()
      .references(() => protocols.id, { onDelete: "cascade" }),
    tripId: uuid("trip_id")
      .notNull()
      .references(() => trips.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    kind: stepKindEnum("kind").notNull(),
    scheduledAt: timestamp("scheduled_at", { withTimezone: true }).notNull(),
    endsAt: timestamp("ends_at", { withTimezone: true }),
    displayTz: text("display_tz").notNull(),
    originalTz: text("original_tz").notNull(),
    payload: jsonb("payload").notNull(),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    notifiedAt: timestamp("notified_at", { withTimezone: true }),
    notifyAttempts: integer("notify_attempts").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (s) => ({
    bySchedule: index("step_schedule_idx").on(s.notifiedAt, s.scheduledAt),
    byTrip: index("step_trip_idx").on(s.tripId, s.scheduledAt),
    byUser: index("step_user_idx").on(s.userId, s.scheduledAt),
  }),
);

// Relations
export const usersRelations = relations(users, ({ one, many }) => ({
  profile: one(profiles, { fields: [users.id], references: [profiles.userId] }),
  trips: many(trips),
}));
export const tripsRelations = relations(trips, ({ one, many }) => ({
  user: one(users, { fields: [trips.userId], references: [users.id] }),
  protocol: one(protocols, { fields: [trips.id], references: [protocols.tripId] }),
  steps: many(steps),
}));
export const protocolsRelations = relations(protocols, ({ one, many }) => ({
  trip: one(trips, { fields: [protocols.tripId], references: [trips.id] }),
  steps: many(steps),
}));
export const stepsRelations = relations(steps, ({ one }) => ({
  protocol: one(protocols, { fields: [steps.protocolId], references: [protocols.id] }),
  trip: one(trips, { fields: [steps.tripId], references: [trips.id] }),
  user: one(users, { fields: [steps.userId], references: [users.id] }),
}));
