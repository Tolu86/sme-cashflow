/**
 * Simple business roles. These permissions describe what a user may do,
 * but do NOT replace server-side authorization or Firestore security rules.
 */
export type BusinessRole = "owner" | "manager" | "staff";

export type BusinessPermission =
  | "viewTransactions"
  | "createTransactions"
  | "editTransactions"
  | "viewReports"
  | "manageTeam"
  | "manageBusiness"
  | "manageBilling";

const ROLE_PERMISSIONS: Record<BusinessRole, readonly BusinessPermission[]> = {
  owner: [
    "viewTransactions",
    "createTransactions",
    "editTransactions",
    "viewReports",
    "manageTeam",
    "manageBusiness",
    "manageBilling",
  ],
  manager: [
    "viewTransactions",
    "createTransactions",
    "editTransactions",
    "viewReports",
    "manageTeam",
  ],
  staff: ["viewTransactions", "createTransactions"],
};

/** Default permissions; enforce them again on the server and in Firestore. */
export function hasBusinessPermission(
  role: BusinessRole | null | undefined,
  permission: BusinessPermission
): boolean {
  return role != null && ROLE_PERMISSIONS[role]?.includes(permission) === true;
}

/** A business owner is always an owner, regardless of membership documents. */
export function resolveBusinessRole(
  userId: string | null | undefined,
  ownerId: string,
  membershipRole?: BusinessRole | null
): BusinessRole | null {
  if (!userId) return null;
  if (userId === ownerId) return "owner";
  return membershipRole === "manager" || membershipRole === "staff"
    ? membershipRole
    : null;
}
