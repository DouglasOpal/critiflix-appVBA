import mongoose from 'mongoose';
const { Schema, model } = mongoose;

// Plain discussion comments on a title. Unlike reviews they carry no rating and
// earn no points: once a critic has watched, reviewed and claimed their points,
// commenting is the only way they can add more to that title.
const commentSchema = new Schema(
  {
    title: { type: Schema.Types.ObjectId, ref: 'Title', required: true, index: true },
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    body: { type: String, required: true, trim: true, maxlength: 1000 },
  },
  { timestamps: true }
);
commentSchema.index({ title: 1, createdAt: -1 });
export const Comment = model('Comment', commentSchema);
