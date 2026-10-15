-- Every admin so far had full control: they become super admins.
UPDATE "users" SET "role" = 'SUPER_ADMIN' WHERE "role" = 'ADMIN';
