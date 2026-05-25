CREATE TYPE "public"."sex" AS ENUM('female', 'male', 'other');--> statement-breakpoint
ALTER TABLE "profile" ADD COLUMN "sex" "sex";--> statement-breakpoint
ALTER TABLE "profile" ADD COLUMN "uses_melatonin" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "profile" ADD COLUMN "onboarded_at" timestamp with time zone;