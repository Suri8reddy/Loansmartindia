import personal from "@/assets/loan-personal.jpg";
import home from "@/assets/loan-home.jpg";
import business from "@/assets/loan-business.jpg";
import car from "@/assets/loan-car.jpg";
import education from "@/assets/loan-education.jpg";
import secured from "@/assets/loan-secured.jpg";
import micro from "@/assets/loan-micro.jpg";

/** Pick a clean illustration for a loan product based on its name/slug. */
export function loanImage(nameOrSlug?: string | null): string {
  const key = String(nameOrSlug ?? "").toLowerCase();
  if (key.includes("home") || key.includes("property") || key.includes("housing")) return home;
  if (key.includes("car") || key.includes("auto") || key.includes("vehicle")) return car;
  if (key.includes("educat") || key.includes("student")) return education;
  if (key.includes("secur") || key.includes("gold") || key.includes("mortgage")) return secured;
  if (key.includes("mudra") || key.includes("mitra") || key.includes("micro")) return micro;
  if (key.includes("business") || key.includes("msme") || key.includes("working")) return business;
  return personal;
}
