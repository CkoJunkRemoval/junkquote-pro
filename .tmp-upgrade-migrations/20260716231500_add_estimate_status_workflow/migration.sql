ALTER TYPE "EstimateStatus" ADD VALUE IF NOT EXISTS 'Ready';
ALTER TYPE "EstimateStatus" ADD VALUE IF NOT EXISTS 'Sent';
ALTER TYPE "EstimateStatus" ADD VALUE IF NOT EXISTS 'Approved';
ALTER TYPE "EstimateStatus" ADD VALUE IF NOT EXISTS 'Declined';
ALTER TYPE "EstimateStatus" ADD VALUE IF NOT EXISTS 'Scheduled';
ALTER TYPE "EstimateStatus" ADD VALUE IF NOT EXISTS 'Completed';
ALTER TYPE "EstimateStatus" ADD VALUE IF NOT EXISTS 'Archived';
