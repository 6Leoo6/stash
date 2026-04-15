/*
  Warnings:

  - Added the required column `encryptedPreview` to the `Stash` table without a default value. This is not possible if the table is not empty.
  - Added the required column `ownerUserId` to the `Stash` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Stash" ADD COLUMN     "encryptedPreview" TEXT NOT NULL,
ADD COLUMN     "ownerUserId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "encryptedStashIndex" TEXT;

-- AddForeignKey
ALTER TABLE "Stash" ADD CONSTRAINT "Stash_ownerUserId_fkey" FOREIGN KEY ("ownerUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
