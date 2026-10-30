// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { buildSampleData } from "@/store/sample";
import { dataKeyFor, STORAGE_KEY, syncMetaKeyFor } from "@/store/storage";
import type { AppData } from "@/domain/types";

/** A faithful-enough fake of the parts of supabase-js the app uses. */
const fake = vi.hoisted(() => {
  type Row = { data: unknown; revision: number };
  const state = {
    rows: new Map<string, Row>(),
    session: null as null | { user: { id: string; email: string } },
    listeners: new Set<(event: string, session: unknown) => void>(),
    pushes: 0,
  };
  const emit = (e: string) => state.listeners.forEach((l) => l(e, state.session));

  const auth = {
    getSession: async () => ({ data: { session: state.session } }),
    onAuthStateChange: (cb: (e: string, s: unknown) => void) => {
      state.listeners.add(cb);
      return { data: { subscription: { unsubscribe: () => state.listeners.delete(cb) } } };
    },
    signInWithPassword: async ({ email, password }: { email: string; password: string }) => {
      if (password !== "correct-horse") return { error: { message: "Invalid login credentials" } };
      state.session = { user: { id: "u1", email } };
      emit("SIGNED_IN");
      return { data: { session: state.session }, error: null };
    },
    signUp: async () => ({ data: { session: null }, error: null }),
    signOut: async () => {
      state.session = null;
      emit("SIGNED_OUT");
      return { error: null };
    },
    resetPasswordForEmail: async () => ({ error: null }),
    updateUser: async () => ({ error: null }),
  };

  function from() {
    const q: { op: string; filters: Record<string, unknown>; payload?: { user_id?: string; data?: unknown } } = { op: "select", filters: {} };
    const run = async (single: boolean) => {
      const id = String(q.filters.user_id ?? q.payload?.user_id);
      const row = state.rows.get(id);
      if (q.op === "select") return { data: single ? (row ? { data: row.data, revision: row.revision } : null) : row ? [row] : [], error: null };
      if (q.op === "insert") {
        if (row) return { data: null, error: { code: "23505", message: "duplicate" } };
        state.pushes++;
        state.rows.set(id, { data: q.payload!.data, revision: 1 });
        return { data: { revision: 1 }, error: null };
      }
      if (row && row.revision === q.filters.revision) {
        state.pushes++;
        state.rows.set(id, { data: q.payload!.data, revision: row.revision + 1 });
        return { data: [{ revision: row.revision + 1 }], error: null };
      }
      return { data: [], error: null };
    };
    const b = {
      select: () => b,
      insert: (p: typeof q.payload) => ((q.op = "insert"), (q.payload = p), b),
      update: (p: typeof q.payload) => ((q.op = "update"), (q.payload = p), b),
      eq: (c: string, v: unknown) => ((q.filters[c] = v), b),
      single: () => run(true),
      maybeSingle: () => run(true),
      then: (res: (v: unknown) => unknown, rej: (e: unknown) => unknown) => run(false).then(res, rej),
    };
    return b;
  }
  return { state, client: { auth, from, rpc: async () => ({ error: null }) } };
});

vi.mock("@/lib/supabase", () => ({ supabase: fake.client, cloudEnabled: true }));

import App from "@/App";

const signedIn = () => (fake.state.session = { user: { id: "u1", email: "ann@example.com" } });
const serverDoc = (): AppData => fake.state.rows.get("u1")!.data as AppData;
const go = (h: string) => {
  window.location.hash = h;
};

beforeEach(() => {
  localStorage.clear();
  fake.state.rows.clear();
  fake.state.session = null;
  fake.state.pushes = 0;
  go("");
});
afterEach(() => cleanup());

describe("signing in", () => {
  it("shows the sign-in screen to signed-out visitors, and rejects a wrong password", async () => {
    const user = userEvent.setup();
    render(<App />);
    expect(await screen.findByText("Welcome back")).toBeTruthy();
    await user.type(screen.getByLabelText("Email"), "ann@example.com");
    await user.type(screen.getByLabelText("Password"), "wrong-password");
    await user.click(screen.getByRole("button", { name: /^sign in$/i }));
    expect(await screen.findByText(/email and password don't match/i)).toBeTruthy();
  });

  it("validates email and password length before calling the server", async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(await screen.findByRole("button", { name: /^sign in$/i }));
    expect(await screen.findByText(/valid email/i)).toBeTruthy();
    await user.type(screen.getByLabelText("Email"), "ann@example.com");
    await user.type(screen.getByLabelText("Password"), "short");
    await user.click(screen.getByRole("button", { name: /^sign in$/i }));
    expect(await screen.findByText(/at least 8 characters/i)).toBeTruthy();
  });

  it("asks new sign-ups to confirm their email", async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(await screen.findByRole("button", { name: /create an account/i }));
    await user.type(screen.getByLabelText("Email"), "new@example.com");
    await user.type(screen.getByLabelText("Password"), "correct-horse");
    await user.click(screen.getByRole("button", { name: /create account/i }));
    expect(await screen.findByText(/check your email/i)).toBeTruthy();
  });

  it("a brand-new account onboards, then its data is saved to the server", async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.type(await screen.findByLabelText("Email"), "ann@example.com");
    await user.type(screen.getByLabelText("Password"), "correct-horse");
    await user.click(screen.getByRole("button", { name: /^sign in$/i }));

    await user.type(await screen.findByLabelText(/what should we call you/i), "Ann");
    await user.click(screen.getByRole("button", { name: /continue/i }));
    await user.click(await screen.findByRole("button", { name: /start tracking/i }));
    await screen.findByText(/Good (morning|afternoon|evening), Ann/);

    await waitFor(() => expect(fake.state.rows.get("u1")).toBeTruthy(), { timeout: 5000 });
    expect(serverDoc().settings).toMatchObject({ name: "Ann", onboarded: true });
    // Cached under this user's own key, never the shared one.
    expect(localStorage.getItem(dataKeyFor("u1"))).toBeTruthy();
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
  });
});

describe("returning users", () => {
  it("loads their data from the server straight into Home", async () => {
    signedIn();
    fake.state.rows.set("u1", { data: buildSampleData("Ann"), revision: 5 });
    render(<App />);
    expect(await screen.findByText("Net worth")).toBeTruthy();
    expect((await screen.findAllByText("All changes saved")).length).toBeGreaterThan(0);
  });

  it("saves edits to the server with the revision guard", async () => {
    const user = userEvent.setup();
    signedIn();
    fake.state.rows.set("u1", { data: buildSampleData("Ann"), revision: 5 });
    render(<App />);
    await screen.findByText("Net worth");
    const before = serverDoc().transactions.length;

    await user.keyboard("n");
    await user.type(await screen.findByLabelText("Amount"), "99");
    await user.click(screen.getByRole("button", { name: /Groceries/ }));
    await user.click(screen.getByRole("button", { name: /^Save$/ }));

    await waitFor(() => expect(serverDoc().transactions.length).toBe(before + 1), { timeout: 5000 });
    expect(fake.state.rows.get("u1")!.revision).toBe(6);
  });

  it("asks before moving pre-account device data into an account", async () => {
    const user = userEvent.setup();
    signedIn();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(buildSampleData("Someone")));
    render(<App />);
    expect(await screen.findByText(/add the data on this device/i)).toBeTruthy();
    await user.click(screen.getByRole("button", { name: /add to my account/i }));
    await waitFor(() => expect(serverDoc().settings.name).toBe("Someone"), { timeout: 5000 });
  });

  it("'Not mine' leaves that data out of the account", async () => {
    const user = userEvent.setup();
    signedIn();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(buildSampleData("Someone")));
    render(<App />);
    await user.click(await screen.findByRole("button", { name: /not mine/i }));
    await screen.findByText(/what should we call you/i); // a fresh onboarding
    expect(fake.state.rows.size).toBe(0);
    expect(localStorage.getItem(STORAGE_KEY)).toBeTruthy(); // untouched
  });

  it("flags a conflict instead of overwriting, and lets the user keep the server's version", async () => {
    const user = userEvent.setup();
    signedIn();
    const local = buildSampleData("Laptop");
    localStorage.setItem(dataKeyFor("u1"), JSON.stringify(local));
    localStorage.setItem(syncMetaKeyFor("u1"), JSON.stringify({ base: 1, dirty: true }));
    fake.state.rows.set("u1", { data: buildSampleData("Phone"), revision: 4 });
    render(<App />);

    expect(await screen.findByText(/your data changed on another device/i)).toBeTruthy();
    expect(fake.state.pushes).toBe(0);
    await user.click(screen.getByRole("button", { name: /use the other device's version/i }));
    await waitFor(() => expect(screen.queryByText(/your data changed on another device/i)).toBeNull());
    expect(await screen.findByText(/Phone/)).toBeTruthy();
    expect(serverDoc().settings.name).toBe("Phone");
  });
});

describe("signing out", () => {
  it("clears this device's cache and returns to the sign-in screen", async () => {
    const user = userEvent.setup();
    signedIn();
    fake.state.rows.set("u1", { data: buildSampleData("Ann"), revision: 5 });
    go("#/settings");
    render(<App />);
    expect(await screen.findByText("ann@example.com")).toBeTruthy();
    await user.click(screen.getByRole("button", { name: /sign out/i }));
    expect(await screen.findByText("Welcome back")).toBeTruthy();
    expect(localStorage.getItem(dataKeyFor("u1"))).toBeNull();
    expect(fake.state.rows.get("u1")).toBeTruthy(); // server copy stays
  });

  it("deleting an account needs the word DELETE", async () => {
    const user = userEvent.setup();
    signedIn();
    fake.state.rows.set("u1", { data: buildSampleData("Ann"), revision: 5 });
    go("#/settings");
    render(<App />);
    await user.click(await screen.findByRole("button", { name: /delete account/i }));
    const confirm = await screen.findByRole("button", { name: /delete everything/i });
    expect((confirm as HTMLButtonElement).disabled).toBe(true);
    await user.type(screen.getByLabelText(/type delete/i), "DELETE");
    expect((confirm as HTMLButtonElement).disabled).toBe(false);
  });
});
