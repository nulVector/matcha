/*
  Warnings:

  - You are about to drop the column `user1DeletedAt` on the `Connection` table. All the data in the column will be lost.
  - You are about to drop the column `user2DeletedAt` on the `Connection` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "Connection_user1Id_user1DeletedAt_idx";

-- DropIndex
DROP INDEX "Connection_user2Id_user2DeletedAt_idx";

-- AlterTable
ALTER TABLE "Connection" DROP COLUMN "user1DeletedAt",
DROP COLUMN "user2DeletedAt",
ADD COLUMN     "user1ChatVisible" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "user1HistoryClearedAt" TIMESTAMP(3),
ADD COLUMN     "user2ChatVisible" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "user2HistoryClearedAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "Connection_user1Id_user1ChatVisible_idx" ON "Connection"("user1Id", "user1ChatVisible");

-- CreateIndex
CREATE INDEX "Connection_user2Id_user2ChatVisible_idx" ON "Connection"("user2Id", "user2ChatVisible");
