/*
  Warnings:

  - A unique constraint covering the columns `[url]` on the table `Avatar` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `category` to the `Interest` table without a default value. This is not possible if the table is not empty.
  - Added the required column `emoji` to the `Interest` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Interest" ADD COLUMN     "category" TEXT NOT NULL,
ADD COLUMN     "emoji" TEXT NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "Avatar_url_key" ON "Avatar"("url");
