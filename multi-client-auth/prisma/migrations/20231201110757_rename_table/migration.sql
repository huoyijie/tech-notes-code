/*
  Warnings:

  - You are about to drop the `apps` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `auth_tokens` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `casbin_rule` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `employees` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `users` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropTable
DROP TABLE `apps`;

-- DropTable
DROP TABLE `auth_tokens`;

-- DropTable
DROP TABLE `casbin_rule`;

-- DropTable
DROP TABLE `employees`;

-- DropTable
DROP TABLE `users`;

-- CreateTable
CREATE TABLE `s_apps` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `created_at` DATETIME NOT NULL DEFAULT NOW(),
    `updated_at` DATETIME NOT NULL DEFAULT NOW() ON UPDATE NOW(),
    `name` VARCHAR(32) NOT NULL,
    `secret` VARCHAR(64) NOT NULL,

    UNIQUE INDEX `s_apps_secret_key`(`secret`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `s_employees` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `created_at` DATETIME NOT NULL DEFAULT NOW(),
    `updated_at` DATETIME NOT NULL DEFAULT NOW() ON UPDATE NOW(),
    `email` VARCHAR(128) NOT NULL,
    `password` VARCHAR(64) NOT NULL,
    `active` BOOLEAN NOT NULL DEFAULT true,
    `super` BOOLEAN NOT NULL DEFAULT false,
    `phone` CHAR(11) NOT NULL,

    UNIQUE INDEX `s_employees_email_key`(`email`),
    UNIQUE INDEX `s_employees_phone_key`(`phone`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `s_users` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `created_at` DATETIME NOT NULL DEFAULT NOW(),
    `updated_at` DATETIME NOT NULL DEFAULT NOW() ON UPDATE NOW(),
    `email` VARCHAR(128) NOT NULL,
    `password` VARCHAR(64) NOT NULL,
    `active` BOOLEAN NOT NULL DEFAULT true,

    UNIQUE INDEX `s_users_email_key`(`email`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `s_auth_tokens` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `created_at` DATETIME NOT NULL DEFAULT NOW(),
    `updated_at` DATETIME NOT NULL DEFAULT NOW() ON UPDATE NOW(),
    `access_token` VARCHAR(64) NOT NULL,
    `refresh_token` VARCHAR(64) NOT NULL,
    `app_id` INTEGER NOT NULL,
    `account_id` INTEGER NOT NULL,

    UNIQUE INDEX `s_auth_tokens_access_token_key`(`access_token`),
    UNIQUE INDEX `s_auth_tokens_refresh_token_key`(`refresh_token`),
    INDEX `s_auth_tokens_app_id_account_id_idx`(`app_id`, `account_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `s_casbin_rules` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `ptype` VARCHAR(191) NOT NULL,
    `v0` VARCHAR(191) NULL,
    `v1` VARCHAR(191) NULL,
    `v2` VARCHAR(191) NULL,
    `v3` VARCHAR(191) NULL,
    `v4` VARCHAR(191) NULL,
    `v5` VARCHAR(191) NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `s_roles` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `created_at` DATETIME NOT NULL DEFAULT NOW(),
    `updated_at` DATETIME NOT NULL DEFAULT NOW() ON UPDATE NOW(),
    `name` VARCHAR(32) NOT NULL,

    UNIQUE INDEX `s_roles_name_key`(`name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
