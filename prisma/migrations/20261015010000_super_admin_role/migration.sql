-- Two admin levels: SUPER_ADMIN has full control, ADMIN reviews submissions and sees the overview.
-- (Added on its own: Postgres cannot use a new enum value in the transaction that adds it.)
ALTER TYPE "Role" ADD VALUE IF NOT EXISTS 'SUPER_ADMIN';
