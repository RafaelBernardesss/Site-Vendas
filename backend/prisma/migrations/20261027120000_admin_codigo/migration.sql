-- CreateTable
CREATE TABLE "AdminCodigo" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "userId" INTEGER NOT NULL,
    "codigoHash" TEXT NOT NULL,
    "expiraEm" DATETIME NOT NULL,
    "tentativas" INTEGER NOT NULL DEFAULT 0,
    "usado" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AdminCodigo_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "AdminCodigo_userId_createdAt_idx" ON "AdminCodigo"("userId", "createdAt");
