-- AlterEnum
ALTER TYPE "public"."ScoringRuleType" ADD VALUE 'GROUP_RANKING_CORRECT';

-- CreateTable
CREATE TABLE "public"."GroupRankingPrediction" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "leagueId" TEXT NOT NULL,
    "groupCode" TEXT NOT NULL,
    "ranking" JSONB NOT NULL,
    "pointsAwarded" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GroupRankingPrediction_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "GroupRankingPrediction_userId_leagueId_groupCode_key" ON "public"."GroupRankingPrediction"("userId", "leagueId", "groupCode");

-- AddForeignKey
ALTER TABLE "public"."GroupRankingPrediction" ADD CONSTRAINT "GroupRankingPrediction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."GroupRankingPrediction" ADD CONSTRAINT "GroupRankingPrediction_leagueId_fkey" FOREIGN KEY ("leagueId") REFERENCES "public"."League"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
