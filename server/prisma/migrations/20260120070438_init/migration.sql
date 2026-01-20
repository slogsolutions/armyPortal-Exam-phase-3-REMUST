/*
  Warnings:

  - Added the required column `selectedExamTypes` to the `Candidate` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE `candidate` ADD COLUMN `selectedExamTypes` VARCHAR(191) NOT NULL;

-- CreateTable
CREATE TABLE `PracticalMarks` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `candidateId` INTEGER NOT NULL,
    `pr1` DOUBLE NULL,
    `pr2` DOUBLE NULL,
    `pr3` DOUBLE NULL,
    `pr4` DOUBLE NULL,
    `pr5` DOUBLE NULL,
    `oral` DOUBLE NULL,
    `enteredBy` INTEGER NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `PracticalMarks_candidateId_key`(`candidateId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `PracticalMarks` ADD CONSTRAINT `PracticalMarks_candidateId_fkey` FOREIGN KEY (`candidateId`) REFERENCES `Candidate`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
