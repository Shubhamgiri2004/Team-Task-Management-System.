/** Normalize Mongoose ObjectIds / populated refs for comparisons & keys */
export function mongoIdString(ref) {
  if (ref == null) return "";
  if (typeof ref === "string") return ref;
  if (typeof ref === "object") {
    if (ref._id != null) return String(ref._id);
    if (ref.id != null) return String(ref.id);
    if (ref.$oid != null) return String(ref.$oid);
  }
  return String(ref);
}
