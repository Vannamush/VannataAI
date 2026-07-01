export interface Example {
  id: string;
  mode:
    | "fix"
    | "edit"
    | "generate"
    | "convert"
    | "translate"
    | "explain"
    | "document"
    | "test";
  title: string;
  description: string;
  language: string;
  prompt: string;
  code: string | null;
}

export const EXAMPLES: Example[] = [
  {
    id: "fix-python-index",
    mode: "fix",
    title: "Off-by-one IndexError",
    description: "A loop that walks past the end of a list and crashes.",
    language: "python",
    prompt:
      "This raises IndexError: list index out of range when I run it. Fix the loop so it prints every item exactly once.",
    code: `def print_all(items):
    for i in range(len(items) + 1):
        print(items[i])

print_all(["alpha", "beta", "gamma"])`,
  },
  {
    id: "fix-js-async",
    mode: "fix",
    title: "Promise never awaited",
    description: "An async function that returns a pending Promise instead of data.",
    language: "javascript",
    prompt:
      "getUserName always logs 'undefined' instead of the name. Figure out what's wrong and fix it.",
    code: `async function fetchUser(id) {
  return { id, name: "Ada Lovelace" };
}

function getUserName(id) {
  const user = fetchUser(id);
  return user.name;
}

console.log(getUserName(1));`,
  },
  {
    id: "fix-sql-injection",
    mode: "fix",
    title: "SQL injection risk",
    description: "A query built with string concatenation from user input.",
    language: "python",
    prompt:
      "A reviewer flagged this as unsafe. Fix the security issue while keeping the same behavior.",
    code: `import sqlite3

def find_user(conn, username):
    cur = conn.cursor()
    cur.execute("SELECT * FROM users WHERE name = '" + username + "'")
    return cur.fetchall()`,
  },
  {
    id: "edit-refactor-ts",
    mode: "edit",
    title: "Refactor to a single reduce",
    description: "Collapse an imperative loop into a functional one-liner.",
    language: "typescript",
    prompt:
      "Refactor totalPrice to use Array.prototype.reduce instead of a for loop, keeping the type signature.",
    code: `interface Item {
  name: string;
  price: number;
  qty: number;
}

function totalPrice(items: Item[]): number {
  let total = 0;
  for (let i = 0; i < items.length; i++) {
    total += items[i].price * items[i].qty;
  }
  return total;
}`,
  },
  {
    id: "edit-add-types",
    mode: "edit",
    title: "Add TypeScript types",
    description: "Convert a plain JS function to fully typed TypeScript.",
    language: "javascript",
    prompt:
      "Add complete TypeScript type annotations to this function, including an interface for the config object.",
    code: `function createServer(config) {
  const { host, port, secure } = config;
  return {
    url: (secure ? "https" : "http") + "://" + host + ":" + port,
    isSecure: secure,
  };
}`,
  },
  {
    id: "generate-debounce",
    mode: "generate",
    title: "Debounce utility",
    description: "Generate a reusable, well-documented debounce function.",
    language: "typescript",
    prompt:
      "Generate a generic, fully-typed debounce utility in TypeScript with JSDoc comments and a leading-edge option.",
    code: null,
  },
  {
    id: "generate-fastapi",
    mode: "generate",
    title: "FastAPI CRUD endpoint",
    description: "Scaffold a small REST API with in-memory storage.",
    language: "python",
    prompt:
      "Generate a FastAPI app with CRUD endpoints for a 'Task' resource (id, title, done) using an in-memory dict, plus a Pydantic model.",
    code: null,
  },
  {
    id: "generate-react-hook",
    mode: "generate",
    title: "useLocalStorage hook",
    description: "A typed React hook that syncs state to localStorage.",
    language: "typescript",
    prompt:
      "Generate a typed React useLocalStorage hook that reads an initial value, persists updates, and handles JSON parse errors gracefully.",
    code: null,
  },
  {
    id: "convert-py-to-js",
    mode: "convert",
    title: "Python to JavaScript",
    description: "Convert a Python function into idiomatic JavaScript.",
    language: "python",
    prompt: "",
    code: `def fizzbuzz(n):
    result = []
    for i in range(1, n + 1):
        if i % 15 == 0:
            result.append("FizzBuzz")
        elif i % 3 == 0:
            result.append("Fizz")
        elif i % 5 == 0:
            result.append("Buzz")
        else:
            result.append(str(i))
    return result`,
  },
  {
    id: "convert-js-to-ts",
    mode: "convert",
    title: "JavaScript to TypeScript",
    description: "Port a JavaScript class to fully typed TypeScript.",
    language: "javascript",
    prompt: "",
    code: `class Stack {
  constructor() {
    this.items = [];
  }
  push(item) {
    this.items.push(item);
  }
  pop() {
    return this.items.pop();
  }
  peek() {
    return this.items[this.items.length - 1];
  }
}`,
  },
  {
    id: "translate-french",
    mode: "translate",
    title: "French greeting",
    description: "A common French phrase to translate into your chosen language.",
    language: "",
    prompt: "",
    code: `Bonjour ! Comment allez-vous aujourd'hui ? J'espère que vous passez une excellente journée.`,
  },
  {
    id: "translate-spanish",
    mode: "translate",
    title: "Spanish sentence",
    description: "Everyday Spanish text to translate into your chosen language.",
    language: "",
    prompt: "",
    code: `Me gustaría reservar una mesa para dos personas esta noche, por favor. ¿Tienen disponibilidad?`,
  },
  {
    id: "translate-japanese",
    mode: "translate",
    title: "Japanese phrase",
    description: "A polite Japanese greeting to translate into your chosen language.",
    language: "",
    prompt: "",
    code: `はじめまして。お会いできて嬉しいです。よろしくお願いします。`,
  },
  {
    id: "explain-regex",
    mode: "explain",
    title: "Explain a dense regex",
    description: "Break down a cryptic validation function.",
    language: "javascript",
    prompt: "Explain what this function does and what input it accepts.",
    code: `const isValid = (s) =>
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[^\\w\\s]).{8,}$/.test(s);`,
  },
  {
    id: "explain-recursion",
    mode: "explain",
    title: "Explain recursion",
    description: "Understand a recursive tree walk.",
    language: "python",
    prompt: "Explain how this recursion works, step by step.",
    code: `def depth(node):
    if node is None:
        return 0
    return 1 + max(depth(node.left), depth(node.right))`,
  },
  {
    id: "document-class",
    mode: "document",
    title: "Document a class",
    description: "Add docstrings and comments to a Python class.",
    language: "python",
    prompt: "Add clear docstrings and inline comments.",
    code: `class RateLimiter:
    def __init__(self, limit, window):
        self.limit = limit
        self.window = window
        self.calls = []

    def allow(self, now):
        self.calls = [t for t in self.calls if now - t < self.window]
        if len(self.calls) < self.limit:
            self.calls.append(now)
            return True
        return False`,
  },
  {
    id: "document-ts-fn",
    mode: "document",
    title: "Add JSDoc",
    description: "Document a TypeScript utility with JSDoc.",
    language: "typescript",
    prompt: "Add complete JSDoc comments.",
    code: `export function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    out.push(arr.slice(i, i + size));
  }
  return out;
}`,
  },
  {
    id: "test-pure-fn",
    mode: "test",
    title: "Test a pure function",
    description: "Generate Vitest tests for a slugify helper.",
    language: "typescript",
    prompt: "Write thorough tests using Vitest.",
    code: `export function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}`,
  },
  {
    id: "test-python",
    mode: "test",
    title: "Test with pytest",
    description: "Generate pytest cases for a discount calculator.",
    language: "python",
    prompt: "Write pytest tests covering edge cases.",
    code: `def apply_discount(price, percent):
    if percent < 0 or percent > 100:
        raise ValueError("percent must be between 0 and 100")
    return round(price * (1 - percent / 100), 2)`,
  },
];
