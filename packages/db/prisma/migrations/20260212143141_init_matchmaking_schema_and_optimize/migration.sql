/*
  Warnings:

  - You are about to drop the column `avatarUrl` on the `Avatar` table. All the data in the column will be lost.
  - You are about to drop the column `pendingRequest` on the `Connection` table. All the data in the column will be lost.
  - You are about to drop the column `user1Agreed` on the `Connection` table. All the data in the column will be lost.
  - You are about to drop the column `user2Agreed` on the `Connection` table. All the data in the column will be lost.
  - You are about to drop the column `matchId` on the `FriendRequest` table. All the data in the column will be lost.
  - You are about to drop the column `interest` on the `Interest` table. All the data in the column will be lost.
  - You are about to drop the column `location` on the `Location` table. All the data in the column will be lost.
  - You are about to drop the column `isRead` on the `Message` table. All the data in the column will be lost.
  - You are about to drop the column `avatarId` on the `UserProfile` table. All the data in the column will be lost.
  - You are about to drop the column `locationId` on the `UserProfile` table. All the data in the column will be lost.
  - You are about to drop the column `status` on the `UserProfile` table. All the data in the column will be lost.
  - You are about to drop the `PasswordResetToken` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `_InterestToUserProfile` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[name]` on the table `Interest` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[name]` on the table `Location` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `url` to the `Avatar` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `Connection` table without a default value. This is not possible if the table is not empty.
  - Added the required column `name` to the `Interest` table without a default value. This is not possible if the table is not empty.
  - Added the required column `latitude` to the `Location` table without a default value. This is not possible if the table is not empty.
  - Added the required column `longitude` to the `Location` table without a default value. This is not possible if the table is not empty.
  - Added the required column `name` to the `Location` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `User` table without a default value. This is not possible if the table is not empty.
  - Added the required column `avatarUrl` to the `UserProfile` table without a default value. This is not possible if the table is not empty.
  - Added the required column `location` to the `UserProfile` table without a default value. This is not possible if the table is not empty.
  - Added the required column `locationLatitude` to the `UserProfile` table without a default value. This is not possible if the table is not empty.
  - Added the required column `locationLongitude` to the `UserProfile` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `UserProfile` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "Message" DROP CONSTRAINT "Message_senderId_fkey";

-- DropForeignKey
ALTER TABLE "PasswordResetToken" DROP CONSTRAINT "PasswordResetToken_userId_fkey";

-- DropForeignKey
ALTER TABLE "UserProfile" DROP CONSTRAINT "UserProfile_avatarId_fkey";

-- DropForeignKey
ALTER TABLE "UserProfile" DROP CONSTRAINT "UserProfile_locationId_fkey";

-- DropForeignKey
ALTER TABLE "_InterestToUserProfile" DROP CONSTRAINT "_InterestToUserProfile_A_fkey";

-- DropForeignKey
ALTER TABLE "_InterestToUserProfile" DROP CONSTRAINT "_InterestToUserProfile_B_fkey";

-- DropIndex
DROP INDEX "Interest_interest_key";

-- DropIndex
DROP INDEX "Location_location_key";

-- DropIndex
DROP INDEX "UserProfile_isActive_status_allowDiscovery_idx";

-- AlterTable
ALTER TABLE "Avatar" DROP COLUMN "avatarUrl",
ADD COLUMN     "url" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "Connection" DROP COLUMN "pendingRequest",
DROP COLUMN "user1Agreed",
DROP COLUMN "user2Agreed",
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "user1LastReadAt" TIMESTAMP(3),
ADD COLUMN     "user1LastReadId" TEXT,
ADD COLUMN     "user2LastReadAt" TIMESTAMP(3),
ADD COLUMN     "user2LastReadId" TEXT;

-- AlterTable
ALTER TABLE "FriendRequest" DROP COLUMN "matchId",
ADD COLUMN     "connectionId" TEXT;

-- AlterTable
ALTER TABLE "Interest" DROP COLUMN "interest",
ADD COLUMN     "name" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "Location" DROP COLUMN "location",
ADD COLUMN     "latitude" DOUBLE PRECISION NOT NULL,
ADD COLUMN     "longitude" DOUBLE PRECISION NOT NULL,
ADD COLUMN     "name" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "Message" DROP COLUMN "isRead",
ALTER COLUMN "senderId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "tokenVersion" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;

-- AlterTable
ALTER TABLE "UserProfile" DROP COLUMN "avatarId",
DROP COLUMN "locationId",
DROP COLUMN "status",
ADD COLUMN     "avatarUrl" TEXT NOT NULL,
ADD COLUMN     "interest" TEXT[],
ADD COLUMN     "lastSeen" TIMESTAMP(3),
ADD COLUMN     "location" TEXT NOT NULL,
ADD COLUMN     "locationLatitude" DOUBLE PRECISION NOT NULL,
ADD COLUMN     "locationLongitude" DOUBLE PRECISION NOT NULL,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;

-- DropTable
DROP TABLE "PasswordResetToken";

-- DropTable
DROP TABLE "_InterestToUserProfile";

-- DropEnum
DROP TYPE "ConnectionRequest";

-- DropEnum
DROP TYPE "UserStatus";

-- CreateIndex
CREATE INDEX "Connection_user1Id_user1DeletedAt_idx" ON "Connection"("user1Id", "user1DeletedAt");

-- CreateIndex
CREATE INDEX "Connection_user2Id_user2DeletedAt_idx" ON "Connection"("user2Id", "user2DeletedAt");

-- CreateIndex
CREATE INDEX "Connection_finalDeleteAt_idx" ON "Connection"("finalDeleteAt");

-- CreateIndex
CREATE INDEX "FriendRequest_receiverId_status_idx" ON "FriendRequest"("receiverId", "status");

-- CreateIndex
CREATE INDEX "FriendRequest_senderId_status_idx" ON "FriendRequest"("senderId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "Interest_name_key" ON "Interest"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Location_name_key" ON "Location"("name");

-- CreateIndex
CREATE INDEX "Message_connectionId_createdAt_idx" ON "Message"("connectionId", "createdAt" DESC);

-- AddForeignKey
ALTER TABLE "Connection" ADD CONSTRAINT "Connection_user1LastReadId_fkey" FOREIGN KEY ("user1LastReadId") REFERENCES "Message"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Connection" ADD CONSTRAINT "Connection_user2LastReadId_fkey" FOREIGN KEY ("user2LastReadId") REFERENCES "Message"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FriendRequest" ADD CONSTRAINT "FriendRequest_connectionId_fkey" FOREIGN KEY ("connectionId") REFERENCES "Connection"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "UserProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;
