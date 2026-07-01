export interface Example {
  id: string;
  mode: "fix" | "edit" | "generate";
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
];
