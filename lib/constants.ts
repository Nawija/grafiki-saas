// Centralized constants for DRY code
export const FEATURES = [
    {
        icon: "Users",
        title: "Panel admina",
        description:
            "Twórz zespoły, zarządzaj pracownikami i przydzielaj role w intuicyjnym panelu administracyjnym.",
    },
    {
        icon: "Calendar",
        title: "Widok tygodniowy i miesięczny",
        description:
            "Przełączaj się między widokami kalendarza, aby zobaczyć grafik w perspektywie tygodnia lub całego miesiąca.",
    },
    {
        icon: "Edit",
        title: "Zarządzanie zmianami",
        description:
            "Dodawaj, edytuj i usuwaj zmiany oraz nieobecności jednym kliknięciem. Pełna kontrola nad grafikiem.",
    },
    {
        icon: "Mail",
        title: "Powiadomienia email",
        description:
            "Automatyczne powiadomienia o nowych zmianach, aktualizacjach grafiku i przypomnienia dla pracowników.",
    },
    {
        icon: "Download",
        title: "Eksport PDF i Excel",
        description:
            "Pobierz grafik w formacie PDF do wydruku lub Excel do dalszej analizy i archiwizacji.",
    },
    {
        icon: "Move",
        title: "Drag & Drop",
        description:
            "Przeciągaj pracowników między zmianami intuicyjnym ruchem myszy. Szybkie i wygodne planowanie.",
    },
] as const;

export const STATS = [
    { value: "10k+", label: "Utworzonych grafików" },
    { value: "500+", label: "Aktywnych zespołów" },
    { value: "85%", label: "Oszczędność czasu" },
    { value: "4.9/5", label: "Ocena użytkowników" },
] as const;

export const DEMO_EMPLOYEES = [
    {
        id: 1,
        name: "Anna K.",
        initials: "AK",
        color: "bg-blue-100 text-blue-700",
    },
    {
        id: 2,
        name: "Michał W.",
        initials: "MW",
        color: "bg-emerald-100 text-emerald-700",
    },
    {
        id: 3,
        name: "Kasia P.",
        initials: "KP",
        color: "bg-violet-100 text-violet-700",
    },
    {
        id: 4,
        name: "Tomek R.",
        initials: "TR",
        color: "bg-amber-100 text-amber-700",
    },
    {
        id: 5,
        name: "Ola S.",
        initials: "OS",
        color: "bg-rose-100 text-rose-700",
    },
] as const;

export const WEEK_DAYS = ["Pon", "Wt", "Śr", "Czw", "Pt", "Sob", "Nd"] as const;

export const DEMO_SCHEDULE = [
    { day: 0, shifts: [1, 2] },
    { day: 1, shifts: [2, 3, 4] },
    { day: 2, shifts: [1, 3] },
    { day: 3, shifts: [1, 2, 5] },
    { day: 4, shifts: [3, 4, 5] },
    { day: 5, shifts: [1, 4] },
    { day: 6, shifts: [2, 5] },
] as const;

export const AI_FEATURES = [
    {
        title: "Analiza godzin otwarcia",
        description:
            "System analizuje godziny otwarcia Twojego sklepu lub salonu i automatycznie dostosowuje grafik.",
    },
    {
        title: "Optymalna obsada",
        description:
            "Algorytm oblicza optymalną liczbę pracowników na każdą zmianę na podstawie historycznych danych.",
    },
    {
        title: "Balans godzin pracy",
        description:
            "Automatyczne wyrównywanie godzin pracy między pracownikami zgodnie z ich umowami.",
    },
] as const;
