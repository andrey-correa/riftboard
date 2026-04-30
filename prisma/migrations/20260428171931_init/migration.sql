-- CreateTable
CREATE TABLE "Player" (
    "id" TEXT NOT NULL,
    "puuid" TEXT NOT NULL,
    "gameName" TEXT NOT NULL,
    "tagLine" TEXT NOT NULL,
    "region" TEXT NOT NULL,
    "summonerId" TEXT,
    "profileIcon" INTEGER,
    "level" INTEGER,
    "lastUpdated" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Player_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlayerRank" (
    "id" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,
    "queueType" TEXT NOT NULL,
    "tier" TEXT,
    "rank" TEXT,
    "leaguePoints" INTEGER,
    "wins" INTEGER,
    "losses" INTEGER,

    CONSTRAINT "PlayerRank_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Match" (
    "id" TEXT NOT NULL,
    "regionRoute" TEXT NOT NULL,
    "duration" INTEGER,
    "rawData" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Match_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Player_puuid_key" ON "Player"("puuid");

-- CreateIndex
CREATE INDEX "Player_region_gameName_tagLine_idx" ON "Player"("region", "gameName", "tagLine");

-- CreateIndex
CREATE UNIQUE INDEX "Player_region_gameName_tagLine_key" ON "Player"("region", "gameName", "tagLine");

-- CreateIndex
CREATE INDEX "PlayerRank_playerId_idx" ON "PlayerRank"("playerId");

-- CreateIndex
CREATE UNIQUE INDEX "PlayerRank_playerId_queueType_key" ON "PlayerRank"("playerId", "queueType");

-- CreateIndex
CREATE INDEX "Match_regionRoute_idx" ON "Match"("regionRoute");

-- AddForeignKey
ALTER TABLE "PlayerRank" ADD CONSTRAINT "PlayerRank_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE CASCADE ON UPDATE CASCADE;
