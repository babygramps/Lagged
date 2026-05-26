import NextAuth from "next-auth";
import Resend from "next-auth/providers/resend";
import Credentials from "next-auth/providers/credentials";
import { DrizzleAdapter } from "@auth/drizzle-adapter";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { accounts, sessions, users, verificationTokens } from "@/lib/db/schema";

const allowDevLogin = process.env.ALLOW_DEV_LOGIN === "1";

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: DrizzleAdapter(db, {
    usersTable: users,
    accountsTable: accounts,
    sessionsTable: sessions,
    verificationTokensTable: verificationTokens,
  }),
  providers: [
    Resend({
      apiKey: process.env.AUTH_RESEND_KEY,
      from: process.env.AUTH_RESEND_FROM ?? "login@example.com",
    }),
    ...(allowDevLogin
      ? [
          Credentials({
            name: "Dev login",
            credentials: { email: { label: "Email", type: "email" } },
            async authorize(credentials) {
              const email = (credentials?.email as string | undefined)?.trim().toLowerCase();
              if (!email) return null;
              const existing = await db.select().from(users).where(eq(users.email, email)).limit(1);
              if (existing[0]) return existing[0];
              const inserted = await db
                .insert(users)
                .values({ email, name: email.split("@")[0] })
                .returning();
              return inserted[0] ?? null;
            },
          }),
        ]
      : []),
  ],
  // Credentials provider requires JWT strategy; only switch when dev login is active.
  session: { strategy: allowDevLogin ? "jwt" : "database" },
  callbacks: {
    async jwt({ token, user }) {
      if (user) token.id = user.id;
      return token;
    },
    async session({ session, token, user }) {
      if (session.user) {
        if (token?.sub) session.user.id = token.sub;
        else if (token && "id" in token && typeof token.id === "string") session.user.id = token.id;
        else if (user) session.user.id = user.id;
      }
      return session;
    },
  },
  pages: { signIn: "/signin" },
});
