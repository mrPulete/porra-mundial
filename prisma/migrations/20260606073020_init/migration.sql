-- CreateEnum
CREATE TYPE "public"."UserRole" AS ENUM ('USER', 'ADMIN');

-- CreateEnum
CREATE TYPE "public"."LeagueRole" AS ENUM ('OWNER', 'MEMBER');

-- CreateEnum
CREATE TYPE "public"."MatchStage" AS ENUM ('GROUP', 'ROUND_OF_32', 'ROUND_OF_16', 'QUARTER_FINAL', 'SEMI_FINAL', 'THIRD_PLACE', 'FINAL');

-- CreateEnum
CREATE TYPE "public"."RankingScope" AS ENUM ('GLOBAL', 'LEAGUE');

-- CreateEnum
CREATE TYPE "public"."ScoringRuleType" AS ENUM ('EXACT_SCORE', 'OUTCOME_1X2', 'SINGLE_TEAM_GOALS', 'QUALIFIED_TEAM', 'CHAMPION_PREDICTION', 'ROUND_NO_CHANGES_BONUS');

-- CreateEnum
CREATE TYPE "public"."PredictionChangeType" AS ENUM ('MATCH_SUBMIT', 'MATCH_EDIT', 'BONUS_SUBMIT', 'BONUS_EDIT');

-- CreateEnum
CREATE TYPE "public"."PenaltyTarget" AS ENUM ('MATCH_EDIT', 'KNOCKOUT_EDIT', 'CHAMPION_EDIT');

-- CreateTable
CREATE TABLE "public"."User" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" "public"."UserRole" NOT NULL DEFAULT 'USER',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Team" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "flagEmoji" TEXT NOT NULL,

    CONSTRAINT "Team_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Match" (
    "id" TEXT NOT NULL,
    "stage" "public"."MatchStage" NOT NULL,
    "group" TEXT,
    "excelCode" TEXT,
    "roundOrder" INTEGER NOT NULL,
    "kickoffAt" TIMESTAMP(3) NOT NULL,
    "homeTeamId" TEXT NOT NULL,
    "awayTeamId" TEXT NOT NULL,
    "homeScore" INTEGER,
    "awayScore" INTEGER,
    "qualifiedTeamId" TEXT,
    "isFinished" BOOLEAN NOT NULL DEFAULT false,
    "bonusMultiplier" INTEGER NOT NULL DEFAULT 1,
    "lockAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Match_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."MatchPrediction" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "matchId" TEXT NOT NULL,
    "leagueId" TEXT,
    "predictedOutcome" TEXT,
    "predictedHome" INTEGER NOT NULL,
    "predictedAway" INTEGER NOT NULL,
    "predictedQualifiedTeamId" TEXT,
    "pointsAwarded" INTEGER NOT NULL DEFAULT 0,
    "penaltyPoints" INTEGER NOT NULL DEFAULT 0,
    "accuracy" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MatchPrediction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."StageScoring" (
    "id" TEXT NOT NULL,
    "stage" "public"."MatchStage" NOT NULL,
    "oneXTwo" INTEGER NOT NULL DEFAULT 1,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StageScoring_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."BonusQuestion" (
    "id" TEXT NOT NULL,
    "question" TEXT NOT NULL,
    "code" TEXT,
    "options" JSONB NOT NULL,
    "points" INTEGER NOT NULL DEFAULT 0,
    "deadline" TIMESTAMP(3) NOT NULL,
    "correctAnswer" JSONB,

    CONSTRAINT "BonusQuestion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."BonusAnswer" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "leagueId" TEXT,
    "answer" JSONB NOT NULL,
    "pointsAwarded" INTEGER NOT NULL DEFAULT 0,
    "penaltyPoints" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "BonusAnswer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Ranking" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "scope" "public"."RankingScope" NOT NULL DEFAULT 'GLOBAL',
    "leagueId" TEXT,
    "totalPoints" INTEGER NOT NULL DEFAULT 0,
    "exactHits" INTEGER NOT NULL DEFAULT 0,
    "accuracy" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "rankPosition" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Ranking_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."League" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "League_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."UserLeagueDraft" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "leagueId" TEXT NOT NULL,
    "matchDrafts" JSONB,
    "bonusDrafts" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserLeagueDraft_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."OfficialSubmission" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "leagueId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "changesCount" INTEGER NOT NULL DEFAULT 0,
    "penaltyApplied" INTEGER NOT NULL DEFAULT 0,
    "matchSnapshot" JSONB NOT NULL,
    "bonusSnapshot" JSONB NOT NULL,

    CONSTRAINT "OfficialSubmission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."ScoringRule" (
    "id" TEXT NOT NULL,
    "leagueId" TEXT NOT NULL,
    "stage" "public"."MatchStage" NOT NULL,
    "ruleType" "public"."ScoringRuleType" NOT NULL,
    "points" INTEGER NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ScoringRule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."BonusRule" (
    "id" TEXT NOT NULL,
    "leagueId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "points" INTEGER NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BonusRule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."PenaltyRule" (
    "id" TEXT NOT NULL,
    "leagueId" TEXT NOT NULL,
    "target" "public"."PenaltyTarget" NOT NULL,
    "points" INTEGER NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PenaltyRule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."PredictionHistory" (
    "id" TEXT NOT NULL,
    "leagueId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "matchId" TEXT,
    "questionId" TEXT,
    "changeType" "public"."PredictionChangeType" NOT NULL,
    "oldValue" JSONB,
    "newValue" JSONB NOT NULL,
    "penaltyApplied" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PredictionHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."LeagueMember" (
    "id" TEXT NOT NULL,
    "leagueId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" "public"."LeagueRole" NOT NULL DEFAULT 'MEMBER',
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LeagueMember_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Account" (
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerAccountId" TEXT NOT NULL,
    "refresh_token" TEXT,
    "access_token" TEXT,
    "expires_at" INTEGER,
    "token_type" TEXT,
    "scope" TEXT,
    "id_token" TEXT,
    "session_state" TEXT,

    CONSTRAINT "Account_pkey" PRIMARY KEY ("provider","providerAccountId")
);

-- CreateTable
CREATE TABLE "public"."Session" (
    "sessionToken" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("sessionToken")
);

-- CreateTable
CREATE TABLE "public"."VerificationToken" (
    "identifier" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VerificationToken_pkey" PRIMARY KEY ("identifier","token")
);

-- CreateTable
CREATE TABLE "public"."TeamFootballData" (
    "id" TEXT NOT NULL,
    "teamCode" TEXT NOT NULL,
    "data" JSONB NOT NULL,
    "fetchedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TeamFootballData_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "public"."User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Team_code_key" ON "public"."Team"("code");

-- CreateIndex
CREATE INDEX "Match_stage_roundOrder_idx" ON "public"."Match"("stage", "roundOrder");

-- CreateIndex
CREATE UNIQUE INDEX "MatchPrediction_userId_matchId_leagueId_key" ON "public"."MatchPrediction"("userId", "matchId", "leagueId");

-- CreateIndex
CREATE UNIQUE INDEX "StageScoring_stage_key" ON "public"."StageScoring"("stage");

-- CreateIndex
CREATE UNIQUE INDEX "BonusAnswer_userId_questionId_leagueId_key" ON "public"."BonusAnswer"("userId", "questionId", "leagueId");

-- CreateIndex
CREATE UNIQUE INDEX "Ranking_userId_scope_leagueId_key" ON "public"."Ranking"("userId", "scope", "leagueId");

-- CreateIndex
CREATE UNIQUE INDEX "League_code_key" ON "public"."League"("code");

-- CreateIndex
CREATE INDEX "UserLeagueDraft_leagueId_updatedAt_idx" ON "public"."UserLeagueDraft"("leagueId", "updatedAt");

-- CreateIndex
CREATE UNIQUE INDEX "UserLeagueDraft_userId_leagueId_key" ON "public"."UserLeagueDraft"("userId", "leagueId");

-- CreateIndex
CREATE INDEX "OfficialSubmission_leagueId_submittedAt_idx" ON "public"."OfficialSubmission"("leagueId", "submittedAt");

-- CreateIndex
CREATE INDEX "OfficialSubmission_userId_leagueId_submittedAt_idx" ON "public"."OfficialSubmission"("userId", "leagueId", "submittedAt");

-- CreateIndex
CREATE UNIQUE INDEX "OfficialSubmission_userId_leagueId_version_key" ON "public"."OfficialSubmission"("userId", "leagueId", "version");

-- CreateIndex
CREATE UNIQUE INDEX "ScoringRule_leagueId_stage_ruleType_key" ON "public"."ScoringRule"("leagueId", "stage", "ruleType");

-- CreateIndex
CREATE UNIQUE INDEX "BonusRule_leagueId_code_key" ON "public"."BonusRule"("leagueId", "code");

-- CreateIndex
CREATE UNIQUE INDEX "PenaltyRule_leagueId_target_key" ON "public"."PenaltyRule"("leagueId", "target");

-- CreateIndex
CREATE INDEX "PredictionHistory_leagueId_createdAt_idx" ON "public"."PredictionHistory"("leagueId", "createdAt");

-- CreateIndex
CREATE INDEX "PredictionHistory_userId_createdAt_idx" ON "public"."PredictionHistory"("userId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "LeagueMember_leagueId_userId_key" ON "public"."LeagueMember"("leagueId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "Session_sessionToken_key" ON "public"."Session"("sessionToken");

-- CreateIndex
CREATE UNIQUE INDEX "VerificationToken_token_key" ON "public"."VerificationToken"("token");

-- CreateIndex
CREATE UNIQUE INDEX "TeamFootballData_teamCode_key" ON "public"."TeamFootballData"("teamCode");

-- AddForeignKey
ALTER TABLE "public"."Match" ADD CONSTRAINT "Match_homeTeamId_fkey" FOREIGN KEY ("homeTeamId") REFERENCES "public"."Team"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Match" ADD CONSTRAINT "Match_awayTeamId_fkey" FOREIGN KEY ("awayTeamId") REFERENCES "public"."Team"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."MatchPrediction" ADD CONSTRAINT "MatchPrediction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."MatchPrediction" ADD CONSTRAINT "MatchPrediction_matchId_fkey" FOREIGN KEY ("matchId") REFERENCES "public"."Match"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."MatchPrediction" ADD CONSTRAINT "MatchPrediction_leagueId_fkey" FOREIGN KEY ("leagueId") REFERENCES "public"."League"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."MatchPrediction" ADD CONSTRAINT "MatchPrediction_predictedQualifiedTeamId_fkey" FOREIGN KEY ("predictedQualifiedTeamId") REFERENCES "public"."Team"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."BonusAnswer" ADD CONSTRAINT "BonusAnswer_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."BonusAnswer" ADD CONSTRAINT "BonusAnswer_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "public"."BonusQuestion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."BonusAnswer" ADD CONSTRAINT "BonusAnswer_leagueId_fkey" FOREIGN KEY ("leagueId") REFERENCES "public"."League"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Ranking" ADD CONSTRAINT "Ranking_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Ranking" ADD CONSTRAINT "Ranking_leagueId_fkey" FOREIGN KEY ("leagueId") REFERENCES "public"."League"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."League" ADD CONSTRAINT "League_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."UserLeagueDraft" ADD CONSTRAINT "UserLeagueDraft_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."UserLeagueDraft" ADD CONSTRAINT "UserLeagueDraft_leagueId_fkey" FOREIGN KEY ("leagueId") REFERENCES "public"."League"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."OfficialSubmission" ADD CONSTRAINT "OfficialSubmission_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."OfficialSubmission" ADD CONSTRAINT "OfficialSubmission_leagueId_fkey" FOREIGN KEY ("leagueId") REFERENCES "public"."League"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ScoringRule" ADD CONSTRAINT "ScoringRule_leagueId_fkey" FOREIGN KEY ("leagueId") REFERENCES "public"."League"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."BonusRule" ADD CONSTRAINT "BonusRule_leagueId_fkey" FOREIGN KEY ("leagueId") REFERENCES "public"."League"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."PenaltyRule" ADD CONSTRAINT "PenaltyRule_leagueId_fkey" FOREIGN KEY ("leagueId") REFERENCES "public"."League"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."PredictionHistory" ADD CONSTRAINT "PredictionHistory_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."PredictionHistory" ADD CONSTRAINT "PredictionHistory_leagueId_fkey" FOREIGN KEY ("leagueId") REFERENCES "public"."League"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."PredictionHistory" ADD CONSTRAINT "PredictionHistory_matchId_fkey" FOREIGN KEY ("matchId") REFERENCES "public"."Match"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."PredictionHistory" ADD CONSTRAINT "PredictionHistory_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "public"."BonusQuestion"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."LeagueMember" ADD CONSTRAINT "LeagueMember_leagueId_fkey" FOREIGN KEY ("leagueId") REFERENCES "public"."League"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."LeagueMember" ADD CONSTRAINT "LeagueMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Account" ADD CONSTRAINT "Account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
