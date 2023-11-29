/*
  Warnings:

  - You are about to alter the column `secret` on the `App` table. The data in that column could be lost. The data in that column will be cast from `VarChar(191)` to `VarChar(64)`.
  - You are about to alter the column `refreshToken` on the `AuthToken` table. The data in that column could be lost. The data in that column will be cast from `VarChar(191)` to `VarChar(32)`.
  - You are about to alter the column `email` on the `Employee` table. The data in that column could be lost. The data in that column will be cast from `VarChar(191)` to `VarChar(128)`.
  - You are about to alter the column `password` on the `Employee` table. The data in that column could be lost. The data in that column will be cast from `VarChar(191)` to `VarChar(64)`.
  - You are about to alter the column `phone` on the `Employee` table. The data in that column could be lost. The data in that column will be cast from `VarChar(191)` to `Char(11)`.
  - You are about to alter the column `email` on the `User` table. The data in that column could be lost. The data in that column will be cast from `VarChar(191)` to `VarChar(128)`.
  - You are about to alter the column `password` on the `User` table. The data in that column could be lost. The data in that column will be cast from `VarChar(191)` to `VarChar(64)`.

*/
-- AlterTable
ALTER TABLE `App` MODIFY `secret` VARCHAR(64) NOT NULL;

-- AlterTable
ALTER TABLE `AuthToken` MODIFY `accessToken` VARCHAR(4096) NOT NULL,
    MODIFY `refreshToken` VARCHAR(32) NOT NULL;

-- AlterTable
ALTER TABLE `Employee` MODIFY `email` VARCHAR(128) NOT NULL,
    MODIFY `password` VARCHAR(64) NOT NULL,
    MODIFY `phone` CHAR(11) NOT NULL;

-- AlterTable
ALTER TABLE `User` MODIFY `email` VARCHAR(128) NOT NULL,
    MODIFY `password` VARCHAR(64) NOT NULL;
