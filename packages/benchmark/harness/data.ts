export interface Employee {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  department: string;
  jobTitle: string;
  salary: number;
  startDate: string;
  location: string;
}

const firstNames = [
  "Alice",
  "Bob",
  "Charlie",
  "Diana",
  "Edward",
  "Fiona",
  "George",
  "Hannah",
  "Ivan",
  "Julia",
  "Kevin",
  "Laura",
  "Michael",
  "Nora",
  "Oscar",
  "Patricia",
  "Quentin",
  "Rachel",
  "Steven",
  "Teresa",
  "Ulrich",
  "Vanessa",
  "William",
  "Xena",
  "Yusuf",
  "Zara",
  "Adrian",
  "Beatrice",
  "Carlos",
  "Delilah",
  "Ethan",
  "Francesca",
  "Gabriel",
  "Helena",
  "Isaac",
  "Jasmine",
  "Kyle",
  "Lydia",
  "Nathan",
  "Olivia",
  "Peter",
  "Quinn",
  "Rosa",
  "Samuel",
  "Tanya",
  "Uma",
  "Victor",
  "Wendy",
  "Xavier",
  "Yvonne",
] as const;

const lastNames = [
  "Anderson",
  "Brown",
  "Chen",
  "Davis",
  "Evans",
  "Fisher",
  "Garcia",
  "Hernandez",
  "Ibrahim",
  "Johnson",
  "Kim",
  "Lee",
  "Martinez",
  "Nguyen",
  "O'Brien",
  "Patel",
  "Quinn",
  "Robinson",
  "Smith",
  "Torres",
  "Ueda",
  "Vasquez",
  "Williams",
  "Xu",
  "Yang",
  "Zhang",
  "Baker",
  "Clark",
  "Diaz",
  "Foster",
  "Green",
  "Harris",
  "Ivanov",
  "Jones",
  "Khan",
  "Lopez",
  "Miller",
  "Nelson",
  "Ortiz",
  "Parker",
  "Reed",
  "Scott",
  "Taylor",
  "Underwood",
  "Vega",
  "Walker",
  "Xie",
  "Young",
  "Zimmerman",
  "Adams",
] as const;

const departments = [
  "Engineering",
  "Product",
  "Design",
  "Marketing",
  "Sales",
  "Finance",
  "Human Resources",
  "Operations",
  "Legal",
  "Customer Support",
] as const;

const jobTitles: Record<(typeof departments)[number], string[]> = {
  Engineering: [
    "Software Engineer",
    "Senior Software Engineer",
    "Staff Engineer",
    "Engineering Manager",
    "Principal Engineer",
  ],
  Product: [
    "Product Manager",
    "Senior Product Manager",
    "Product Analyst",
    "Director of Product",
    "Associate PM",
  ],
  Design: ["UX Designer", "Senior UX Designer", "UI Designer", "Design Lead", "Visual Designer"],
  Marketing: [
    "Marketing Manager",
    "Content Strategist",
    "Growth Analyst",
    "Brand Manager",
    "SEO Specialist",
  ],
  Sales: ["Account Executive", "Sales Manager", "Sales Engineer", "BDR", "VP of Sales"],
  Finance: ["Financial Analyst", "Controller", "Accountant", "FP&A Manager", "CFO"],
  "Human Resources": [
    "HR Manager",
    "Recruiter",
    "People Partner",
    "Compensation Analyst",
    "HR Coordinator",
  ],
  Operations: [
    "Operations Manager",
    "Supply Chain Analyst",
    "Logistics Coordinator",
    "COO",
    "Operations Analyst",
  ],
  Legal: [
    "Legal Counsel",
    "Paralegal",
    "Compliance Officer",
    "General Counsel",
    "Contract Manager",
  ],
  "Customer Support": [
    "Support Engineer",
    "Support Lead",
    "CS Manager",
    "Technical Support",
    "Support Specialist",
  ],
};

const locations = [
  "New York, NY",
  "San Francisco, CA",
  "Austin, TX",
  "Seattle, WA",
  "Chicago, IL",
  "Denver, CO",
  "Boston, MA",
  "Los Angeles, CA",
  "Portland, OR",
  "Atlanta, GA",
  "Miami, FL",
  "Remote",
] as const;

function createRng(seed: number) {
  let state = seed;
  return function next(): number {
    state = (state * 1664525 + 1013904223) & 0x7fffffff;
    return state / 0x7fffffff;
  };
}

function pick<T>(arr: readonly T[], rng: () => number): T {
  // biome-ignore lint/style/noNonNullAssertion: array is non-empty and index is always in bounds
  return arr[Math.floor(rng() * arr.length)]!;
}

export function generateEmployees(count: number): Employee[] {
  const rng = createRng(42);
  const employees: Employee[] = [];

  for (let i = 0; i < count; i++) {
    const firstName = pick(firstNames, rng);
    const lastName = pick(lastNames, rng);
    const department = pick(departments, rng);
    const titles = jobTitles[department];
    const jobTitle = pick(titles, rng);

    const baseSalary =
      department === "Engineering"
        ? 110000
        : department === "Product"
          ? 105000
          : department === "Sales"
            ? 90000
            : department === "Finance"
              ? 95000
              : department === "Legal"
                ? 100000
                : 85000;
    const salary = Math.round(baseSalary + (rng() - 0.3) * 50000);

    const year = 2018 + Math.floor(rng() * 7);
    const month = 1 + Math.floor(rng() * 12);
    const day = 1 + Math.floor(rng() * 28);
    const startDate = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;

    employees.push({
      id: i + 1,
      firstName,
      lastName,
      email: `${firstName.toLowerCase()}.${lastName.toLowerCase().replace("'", "")}@example.com`,
      department,
      jobTitle,
      salary,
      startDate,
      location: pick(locations, rng),
    });
  }

  return employees;
}
