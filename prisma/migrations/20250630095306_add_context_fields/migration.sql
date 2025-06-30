-- AlterTable
ALTER TABLE "Fragment" ADD COLUMN     "description" TEXT,
ADD COLUMN     "tags" TEXT[];

-- AlterTable
ALTER TABLE "Message" ADD COLUMN     "contextId" TEXT;

-- AlterTable
ALTER TABLE "Project" ADD COLUMN     "description" TEXT;
