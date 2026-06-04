-- Add nullable qualified-team persistence for knockout matches decided on penalties
ALTER TABLE "Match" ADD COLUMN "qualifiedTeamId" TEXT;

-- Add nullable correct-answer storage for bonus questions (enables bonus scoring)
ALTER TABLE "BonusQuestion" ADD COLUMN "correctAnswer" JSONB;
