-- Terminal, independently verified failures release the existing unresolved
-- checkout fence without pretending money was received or deleting the attempt.
ALTER TYPE "PaystackAttemptStatus" ADD VALUE IF NOT EXISTS 'FAILED';
ALTER TYPE "PaystackAttemptStatus" ADD VALUE IF NOT EXISTS 'ABANDONED';
