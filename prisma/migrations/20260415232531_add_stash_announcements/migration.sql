-- AlterTable
ALTER TABLE "Stash" ADD COLUMN     "encryptedAnnouncements" JSONB NOT NULL DEFAULT '[]';
