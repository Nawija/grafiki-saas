import { z } from "zod";

export const organizationSchema = z.object({
    name: z
        .string()
        .min(1, "Nazwa organizacji jest wymagana")
        .min(2, "Nazwa musi mieć minimum 2 znaki")
        .max(100, "Nazwa może mieć maksymalnie 100 znaków"),
});

export const organizationUpdateSchema = organizationSchema.partial();

export type OrganizationInput = z.infer<typeof organizationSchema>;
export type OrganizationUpdateInput = z.infer<typeof organizationUpdateSchema>;

/**
 * Generuje slug z nazwy organizacji
 */
export function generateSlug(name: string): string {
    return name
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "") // Usuń akcenty
        .replace(/[^a-z0-9]+/g, "-") // Zamień nie-alfanumeryczne na myślniki
        .replace(/^-+|-+$/g, "") // Usuń myślniki z początku i końca
        .substring(0, 50); // Ogranicz długość
}
