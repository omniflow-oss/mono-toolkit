import path from "node:path";

export const getPackageRoot = (): string => {
  return path.resolve(__dirname, "..", "..");
};
