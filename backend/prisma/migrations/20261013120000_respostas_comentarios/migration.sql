-- CreateTable
CREATE TABLE "Resposta" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "comentarioId" INTEGER NOT NULL,
    "userId" INTEGER NOT NULL,
    "texto" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Resposta_comentarioId_fkey" FOREIGN KEY ("comentarioId") REFERENCES "Comentario" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Resposta_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "Resposta_comentarioId_createdAt_idx" ON "Resposta"("comentarioId", "createdAt");
