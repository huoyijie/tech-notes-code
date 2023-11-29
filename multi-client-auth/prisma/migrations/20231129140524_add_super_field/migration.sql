-- DropIndex
DROP INDEX `AuthToken_appId_fkey` ON `AuthToken`;

-- DropIndex
DROP INDEX `AuthToken_employeeId_fkey` ON `AuthToken`;

-- AlterTable
ALTER TABLE `Employee` ADD COLUMN `super` BOOLEAN NOT NULL DEFAULT false;
