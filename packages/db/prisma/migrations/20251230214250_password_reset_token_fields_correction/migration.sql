/*
  Warnings:

  - You are about to drop the column `expriesAt` on the `PasswordResetToken` table. All the data in the column will be lost.
  - You are about to drop the column `userID` on the `PasswordResetToken` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[userId]` on the table `PasswordResetToken` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `expiresAt` to the `PasswordResetToken` table without a default value. This is not possible if the table is not empty.
  - Added the required column `userId` to the `PasswordResetToken` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "PasswordResetToken" DROP CONSTRAINT "PasswordResetToken_userID_fkey";

-- DropIndex
DROP INDEX "PasswordResetToken_userID_key";

-- AlterTable
ALTER TABLE "PasswordResetToken" DROP COLUMN "expriesAt",
DROP COLUMN "userID",
ADD COLUMN     "expiresAt" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "userId" INTEGER NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "PasswordResetToken_userId_key" ON "PasswordResetToken"("userId");

-- AddForeignKey
ALTER TABLE "PasswordResetToken" ADD CONSTRAINT "PasswordResetToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
