export function getDisplayName(
  fullName: string | null | undefined,
  email: string | null | undefined
): string {
  if (fullName && fullName.trim()) {
    return fullName.trim();
  }

  if (email) {
    return email.split("@")[0];
  }

  return "";
}
