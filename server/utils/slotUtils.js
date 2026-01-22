const recalcSlotCurrentCount = async (client, slotId) => {
  const count = await client.candidate.count({
    where: {
      examSlots: {
        some: { id: slotId }
      }
    }
  });

  await client.examSlot.update({
    where: { id: slotId },
    data: { currentCount: count }
  });
};

module.exports = {
  recalcSlotCurrentCount
};
