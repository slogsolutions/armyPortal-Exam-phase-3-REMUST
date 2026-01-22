/*
  Warnings:

  - You are about to drop the column `examPaperId` on the `examslot` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE `examslot` DROP FOREIGN KEY `ExamSlot_examPaperId_fkey`;

-- DropIndex
DROP INDEX `ExamSlot_examPaperId_fkey` ON `examslot`;

-- AlterTable
ALTER TABLE `examslot` DROP COLUMN `examPaperId`;
