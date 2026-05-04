import mongoose, { Document, Schema, Types } from "mongoose";

export type ProjectStatus = "IN_PROGRESS" | "DONE" | "OVERDUE";

export interface IProject extends Document {
  name: string;
  description: string;
  status: ProjectStatus;
  createdBy: Types.ObjectId;
  members: Types.ObjectId[];
}

const projectSchema = new Schema<IProject>(
  {
    name: { type: String, required: true, trim: true },
    description: { type: String, default: "", trim: true },
    status: {
      type: String,
      enum: ["IN_PROGRESS", "DONE", "OVERDUE"],
      default: "IN_PROGRESS",
    },
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    members: [{ type: Schema.Types.ObjectId, ref: "User" }],
  },
  { timestamps: true }
);

export const Project = mongoose.model<IProject>("Project", projectSchema);
