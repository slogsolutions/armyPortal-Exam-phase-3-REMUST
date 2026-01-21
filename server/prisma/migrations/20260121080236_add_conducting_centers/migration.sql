/*
  Warnings:

  - You are about to drop the column `minPercent` on the `trade` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[commandId,name]` on the table `ConductingCenter` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `commandId` to the `ConductingCenter` table without a default value. This is not possible if the table is not empty.
  - Added the required column `defaultTime` to the `Trade` table without a default value. This is not possible if the table is not empty.
  - Added the required column `totalMarks` to the `Trade` table without a default value. This is not possible if the table is not empty.
  - Added the required column `totalQuestions` to the `Trade` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE `candidate` DROP FOREIGN KEY `Candidate_centerId_fkey`;

-- DropIndex
DROP INDEX `Candidate_centerId_fkey` ON `candidate`;

-- DropIndex
DROP INDEX `ConductingCenter_name_key` ON `conductingcenter`;

-- AlterTable
ALTER TABLE `candidate` MODIFY `centerId` INTEGER NULL;

-- AlterTable
ALTER TABLE `conductingcenter` ADD COLUMN `commandId` INTEGER NOT NULL;

-- AlterTable
ALTER TABLE `examattempt` ADD COLUMN `examSlotId` INTEGER NULL;

-- AlterTable
ALTER TABLE `trade` DROP COLUMN `minPercent`,
    ADD COLUMN `defaultTime` INTEGER NOT NULL,
    ADD COLUMN `totalMarks` DOUBLE NOT NULL,
    ADD COLUMN `totalQuestions` INTEGER NOT NULL,
    ADD COLUMN `wp3` BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE `ExamSlot` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `tradeId` INTEGER NOT NULL,
    `examPaperId` INTEGER NULL,
    `paperType` VARCHAR(191) NOT NULL,
    `startTime` DATETIME(3) NOT NULL,
    `endTime` DATETIME(3) NOT NULL,
    `commandId` INTEGER NOT NULL,
    `centerId` INTEGER NOT NULL,
    `currentCount` INTEGER NOT NULL DEFAULT 0,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `ExamSlot_tradeId_paperType_startTime_key`(`tradeId`, `paperType`, `startTime`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `_CandidateToExamSlot` (
    `A` INTEGER NOT NULL,
    `B` INTEGER NOT NULL,

    UNIQUE INDEX `_CandidateToExamSlot_AB_unique`(`A`, `B`),
    INDEX `_CandidateToExamSlot_B_index`(`B`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE UNIQUE INDEX `ConductingCenter_commandId_name_key` ON `ConductingCenter`(`commandId`, `name`);

-- AddForeignKey
ALTER TABLE `ConductingCenter` ADD CONSTRAINT `ConductingCenter_commandId_fkey` FOREIGN KEY (`commandId`) REFERENCES `Command`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Candidate` ADD CONSTRAINT `Candidate_centerId_fkey` FOREIGN KEY (`centerId`) REFERENCES `ConductingCenter`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ExamAttempt` ADD CONSTRAINT `ExamAttempt_examSlotId_fkey` FOREIGN KEY (`examSlotId`) REFERENCES `ExamSlot`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ExamSlot` ADD CONSTRAINT `ExamSlot_tradeId_fkey` FOREIGN KEY (`tradeId`) REFERENCES `Trade`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ExamSlot` ADD CONSTRAINT `ExamSlot_examPaperId_fkey` FOREIGN KEY (`examPaperId`) REFERENCES `ExamPaper`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ExamSlot` ADD CONSTRAINT `ExamSlot_commandId_fkey` FOREIGN KEY (`commandId`) REFERENCES `Command`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ExamSlot` ADD CONSTRAINT `ExamSlot_centerId_fkey` FOREIGN KEY (`centerId`) REFERENCES `ConductingCenter`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `_CandidateToExamSlot` ADD CONSTRAINT `_CandidateToExamSlot_A_fkey` FOREIGN KEY (`A`) REFERENCES `Candidate`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `_CandidateToExamSlot` ADD CONSTRAINT `_CandidateToExamSlot_B_fkey` FOREIGN KEY (`B`) REFERENCES `ExamSlot`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
