-- Remove GROUP_RANKING_CORRECT rules from ScoringRule
DELETE FROM "public"."ScoringRule" WHERE "ruleType" = 'GROUP_RANKING_CORRECT';

-- DropForeignKey
ALTER TABLE "public"."GroupRankingPrediction" DROP CONSTRAINT "GroupRankingPrediction_leagueId_fkey";

-- DropForeignKey
ALTER TABLE "public"."GroupRankingPrediction" DROP CONSTRAINT "GroupRankingPrediction_userId_fkey";

-- DropTable
DROP TABLE "public"."GroupRankingPrediction";

-- AlterEnum
ALTER TYPE "public"."ScoringRuleType" RENAME TO "ScoringRuleType_old";
CREATE TYPE "public"."ScoringRuleType" AS ENUM('EXACT_SCORE', 'OUTCOME_1X2', 'SINGLE_TEAM_GOALS', 'QUALIFIED_TEAM', 'CHAMPION_PREDICTION', 'ROUND_NO_CHANGES_BONUS');
ALTER TABLE "public"."ScoringRule" ALTER COLUMN "ruleType" TYPE "public"."ScoringRuleType" USING "ruleType"::text::"public"."ScoringRuleType";
DROP TYPE "public"."ScoringRuleType_old";
