import mongoose from 'mongoose';
const { Schema, model } = mongoose;

// Platform settings editable from the admin console, one document per key
// (e.g. key "economy" holds the points benchmark and Naira-per-point rate).
const settingSchema = new Schema(
  {
    key: { type: String, required: true, unique: true, index: true },
    value: { type: Schema.Types.Mixed, default: {} },
    updatedBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
  },
  { timestamps: true, minimize: false }
);
export const Setting = model('Setting', settingSchema);
