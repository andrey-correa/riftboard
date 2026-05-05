-- CreateTable
CREATE TABLE "ChampionAggregate" (
    "id" TEXT NOT NULL,
    "championId" INTEGER NOT NULL,
    "championName" TEXT NOT NULL,
    "patch" TEXT NOT NULL,
    "region" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "queueId" INTEGER NOT NULL,
    "games" INTEGER NOT NULL,
    "wins" INTEGER NOT NULL,
    "winRate" DOUBLE PRECISION NOT NULL,
    "pickRate" DOUBLE PRECISION NOT NULL,
    "avgKills" DOUBLE PRECISION NOT NULL,
    "avgDeaths" DOUBLE PRECISION NOT NULL,
    "avgAssists" DOUBLE PRECISION NOT NULL,
    "avgKda" DOUBLE PRECISION NOT NULL,
    "avgCs" DOUBLE PRECISION NOT NULL,
    "avgGold" DOUBLE PRECISION NOT NULL,
    "avgDamage" DOUBLE PRECISION NOT NULL,
    "avgVision" DOUBLE PRECISION NOT NULL,
    "tierScore" DOUBLE PRECISION,
    "tierLabel" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ChampionAggregate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChampionBuildAggregate" (
    "id" TEXT NOT NULL,
    "championId" INTEGER NOT NULL,
    "championName" TEXT NOT NULL,
    "patch" TEXT NOT NULL,
    "region" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "queueId" INTEGER NOT NULL,
    "itemBuildKey" TEXT NOT NULL,
    "itemIds" INTEGER[],
    "games" INTEGER NOT NULL,
    "wins" INTEGER NOT NULL,
    "winRate" DOUBLE PRECISION NOT NULL,
    "pickRate" DOUBLE PRECISION NOT NULL,
    "avgKda" DOUBLE PRECISION NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ChampionBuildAggregate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChampionRuneAggregate" (
    "id" TEXT NOT NULL,
    "championId" INTEGER NOT NULL,
    "championName" TEXT NOT NULL,
    "patch" TEXT NOT NULL,
    "region" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "queueId" INTEGER NOT NULL,
    "runeKey" TEXT NOT NULL,
    "primaryRuneStyle" INTEGER NOT NULL,
    "secondaryRuneStyle" INTEGER NOT NULL,
    "keystoneId" INTEGER NOT NULL,
    "games" INTEGER NOT NULL,
    "wins" INTEGER NOT NULL,
    "winRate" DOUBLE PRECISION NOT NULL,
    "pickRate" DOUBLE PRECISION NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ChampionRuneAggregate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChampionSpellAggregate" (
    "id" TEXT NOT NULL,
    "championId" INTEGER NOT NULL,
    "championName" TEXT NOT NULL,
    "patch" TEXT NOT NULL,
    "region" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "queueId" INTEGER NOT NULL,
    "spellKey" TEXT NOT NULL,
    "summoner1Id" INTEGER NOT NULL,
    "summoner2Id" INTEGER NOT NULL,
    "games" INTEGER NOT NULL,
    "wins" INTEGER NOT NULL,
    "winRate" DOUBLE PRECISION NOT NULL,
    "pickRate" DOUBLE PRECISION NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ChampionSpellAggregate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChampionMatchupAggregate" (
    "id" TEXT NOT NULL,
    "championId" INTEGER NOT NULL,
    "championName" TEXT NOT NULL,
    "opponentChampionId" INTEGER NOT NULL,
    "opponentChampionName" TEXT NOT NULL,
    "patch" TEXT NOT NULL,
    "region" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "queueId" INTEGER NOT NULL,
    "games" INTEGER NOT NULL,
    "wins" INTEGER NOT NULL,
    "winRate" DOUBLE PRECISION NOT NULL,
    "difficultyLabel" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ChampionMatchupAggregate_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ChampionAggregate_patch_region_role_queueId_idx" ON "ChampionAggregate"("patch", "region", "role", "queueId");

-- CreateIndex
CREATE INDEX "ChampionAggregate_championId_idx" ON "ChampionAggregate"("championId");

-- CreateIndex
CREATE UNIQUE INDEX "ChampionAggregate_championId_patch_region_role_queueId_key" ON "ChampionAggregate"("championId", "patch", "region", "role", "queueId");

-- CreateIndex
CREATE INDEX "ChampionBuildAggregate_championId_patch_region_role_queueId_idx" ON "ChampionBuildAggregate"("championId", "patch", "region", "role", "queueId");

-- CreateIndex
CREATE UNIQUE INDEX "ChampionBuildAggregate_championId_patch_region_role_queueId_key" ON "ChampionBuildAggregate"("championId", "patch", "region", "role", "queueId", "itemBuildKey");

-- CreateIndex
CREATE INDEX "ChampionRuneAggregate_championId_patch_region_role_queueId_idx" ON "ChampionRuneAggregate"("championId", "patch", "region", "role", "queueId");

-- CreateIndex
CREATE UNIQUE INDEX "ChampionRuneAggregate_championId_patch_region_role_queueId__key" ON "ChampionRuneAggregate"("championId", "patch", "region", "role", "queueId", "runeKey");

-- CreateIndex
CREATE INDEX "ChampionSpellAggregate_championId_patch_region_role_queueId_idx" ON "ChampionSpellAggregate"("championId", "patch", "region", "role", "queueId");

-- CreateIndex
CREATE UNIQUE INDEX "ChampionSpellAggregate_championId_patch_region_role_queueId_key" ON "ChampionSpellAggregate"("championId", "patch", "region", "role", "queueId", "spellKey");

-- CreateIndex
CREATE INDEX "ChampionMatchupAggregate_championId_patch_region_role_queue_idx" ON "ChampionMatchupAggregate"("championId", "patch", "region", "role", "queueId");

-- CreateIndex
CREATE UNIQUE INDEX "ChampionMatchupAggregate_championId_opponentChampionId_patc_key" ON "ChampionMatchupAggregate"("championId", "opponentChampionId", "patch", "region", "role", "queueId");
