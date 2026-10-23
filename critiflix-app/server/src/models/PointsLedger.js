import mongoose from 'mongoose';
const { Schema, model } = mongoose;

// Append-only ledger of every points movement (audit trail for balances).
const ledgerSchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    type: { type: String, enum: ['watch', 'review', 'rating', 'referral', 'redeem', 'adjustment'], required: true },
    points: { type: Number, required: true },        // positive earn, negative spend
    ref: { type: String, default: '' },              // human description (title name, destination…)
    title: { type: Schema.Types.ObjectId, ref: 'Title', default: null },
    benchmark: { type: Number, default: 0 },         // part of `points` that went to the non-cash benchmark
    balanceAfter: { type: Number, default: null },   // cashable balance snapshot for convenience
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);
ledgerSchema.index({ user: 1, createdAt: -1 });
export const PointsLedger = model('PointsLedger', ledgerSchema);
