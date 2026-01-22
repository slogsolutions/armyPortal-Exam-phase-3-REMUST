const prisma = require("../config/prisma");

const WRITTEN_SEQUENCE = ["WP-I", "WP-II", "WP-III"];

const getOrderedWrittenTypes = (selectedTypes = []) =>
  WRITTEN_SEQUENCE.filter((type) => selectedTypes.includes(type));

const slotSummary = (slot) =>
  slot
    ? {
        id: slot.id,
        paperType: slot.paperType,
        startTime: slot.startTime,
        endTime: slot.endTime,
        command: slot.command?.name || null,
        center: slot.center?.name || null
      }
    : null;

const ensureSlotForPaper = async (candidate, paperType) => {
  if (!paperType) return null;
  const now = new Date();

  const existingSlot = await prisma.examSlot.findFirst({
    where: {
      tradeId: candidate.tradeId,
      paperType,
      isActive: true,
      endTime: { gte: now },
      candidates: {
        some: { id: candidate.id }
      }
    },
    orderBy: { startTime: "asc" },
    include: { command: true, center: true }
  });

  if (existingSlot) {
    return existingSlot;
  }

  const slotFilters = {
    tradeId: candidate.tradeId,
    paperType,
    commandId: candidate.commandId,
    isActive: true,
    startTime: { gte: now }
  };

  if (candidate.centerId) {
    slotFilters.centerId = candidate.centerId;
  }

  const nextSlot = await prisma.examSlot.findFirst({
    where: slotFilters,
    orderBy: { startTime: "asc" },
    include: { command: true, center: true }
  });

  if (!nextSlot) {
    return null;
  }

  try {
    await prisma.examSlot.update({
      where: { id: nextSlot.id },
      data: {
        currentCount: { increment: 1 },
        candidates: {
          connect: { id: candidate.id }
        }
      }
    });
  } catch (error) {
    // Ignore duplicate connection errors and continue
  }

  return nextSlot;
};

module.exports = {
  WRITTEN_SEQUENCE,
  getOrderedWrittenTypes,
  slotSummary,
  ensureSlotForPaper
};
