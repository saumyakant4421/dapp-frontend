export function isCompanyEmail(email: string) {
  return !email.includes("@gmail.com") &&
         !email.includes("@yahoo.com") &&
         !email.includes("@outlook.com");
}