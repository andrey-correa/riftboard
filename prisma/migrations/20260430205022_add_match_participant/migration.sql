-- CreateTable
CREATE TABLE "MatchParticipant" (
    "id" TEXT NOT NULL,
    "matchId" TEXT NOT NULL,
    "puuid" TEXT NOT NULL,
    "region" TEXT NOT NULL,
    "gameName" TEXT,
    "tagLine" TEXT,
    "championId" INTEGER NOT NULL,
    "championName" TEXT NOT NULL,
    "teamId" INTEGER NOT NULL,
    "win" BOOLEAN NOT NULL,
    "kills" INTEGER NOT NULL,
    "deaths" INTEGER NOT NULL,
    "assists" INTEGER NOT NULL,
    "cs" INTEGER NOT NULL,
    "goldEarned" INTEGER NOT NULL,
    "damageToChampions" INTEGER NOT NULL,
    "damageTaken" INTEGER NOT NULL,
    "visionScore" INTEGER NOT NULL,
    "role" TEXT,
    "lane" TEXT,
    "queueId" INTEGER NOT NULL,
    "gameMode" TEXT NOT NULL,
    "gameCreation" BIGINT NOT NULL,
    "gameDuration" INTEGER NOT NULL,
    "patch" TEXT,
    "item0" INTEGER NOT NULL DEFAULT 0,
    "item1" INTEGER NOT NULL DEFAULT 0,
    "item2" INTEGER NOT NULL DEFAULT 0,
    "item3" INTEGER NOT NULL DEFAULT 0,
    "item4" INTEGER NOT NULL DEFAULT 0,
    "item5" INTEGER NOT NULL DEFAULT 0,
    "item6" INTEGER NOT NULL DEFAULT 0,
    "summoner1Id" INTEGER NOT NULL,
    "summoner2Id" INTEGER NOT NULL,
    "primaryRuneStyle" INTEGER,
    "secondaryRuneStyle" INTEGER,
    "keystoneId" INTEGER,
    "rawPerks" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MatchParticipant_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "MatchParticipant_championId_idx" ON "MatchParticipant"("championId");

-- CreateIndex
CREATE INDEX "MatchParticipant_championName_idx" ON "MatchParticipant"("championName");

-- CreateIndex
CREATE INDEX "MatchParticipant_region_idx" ON "MatchParticipant"("region");

-- CreateIndex
CREATE INDEX "MatchParticipant_patch_idx" ON "MatchParticipant"("patch");

-- CreateIndex
CREATE INDEX "MatchParticipant_role_idx" ON "MatchParticipant"("role");

-- CreateIndex
CREATE INDEX "MatchParticipant_queueId_idx" ON "MatchParticipant"("queueId");

-- CreateIndex
CREATE INDEX "MatchParticipant_puuid_idx" ON "MatchParticipant"("puuid");

-- CreateIndex
CREATE INDEX "MatchParticipant_gameCreation_idx" ON "MatchParticipant"("gameCreation");

-- CreateIndex
CREATE INDEX "MatchParticipant_patch_region_role_queueId_idx" ON "MatchParticipant"("patch", "region", "role", "queueId");

-- CreateIndex
CREATE UNIQUE INDEX "MatchParticipant_matchId_puuid_key" ON "MatchParticipant"("matchId", "puuid");

-- AddForeignKey
ALTER TABLE "MatchParticipant" ADD CONSTRAINT "MatchParticipant_matchId_fkey" FOREIGN KEY ("matchId") REFERENCES "Match"("id") ON DELETE CASCADE ON UPDATE CASCADE;
