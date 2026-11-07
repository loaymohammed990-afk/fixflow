import mongoose from "mongoose";
import { ORDER_STATUSES } from "../../../src/data/mockOrders.js";
export { ORDER_STATUSES };
const schema = new mongoose.Schema(
  {
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    id: {
      type: Number,
      required: true,
      min: 1,
      max: Number.MAX_SAFE_INTEGER,
      validate: Number.isSafeInteger,
    },
    customerName: { type: String, required: true, trim: true, maxlength: 100 },
    phone: { type: String, required: true, match: /^\+?\d{7,15}$/ },
    deviceType: { type: String, required: true, enum: ["جوال", "لابتوب"] },
    deviceName: { type: String, required: true, trim: true, maxlength: 100 },
    serialNumber: { type: String, trim: true, default: "", maxlength: 100 },
    problem: { type: String, required: true, trim: true, maxlength: 2000 },
    status: {
      type: String,
      enum: ORDER_STATUSES,
      default: ORDER_STATUSES[0],
      required: true,
    },
  },
  { timestamps: true, bufferCommands: false },
);
schema.index({ id: 1 }, { unique: true });
schema.index({ createdAt: -1, id: -1 });
export const Order = mongoose.model("Order", schema);
