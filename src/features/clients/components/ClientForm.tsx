import { createClientAction } from "../actions/create-client";

export function ClientForm() {
  return (
    <form action={createClientAction} className="grid gap-4 rounded-xl border p-4">
      <div className="grid gap-2">
        <label htmlFor="name" className="text-sm font-medium">
          Client Name
        </label>
        <input
          id="name"
          name="name"
          required
          className="rounded-md border px-3 py-2"
          placeholder="Coastal Stays"
        />
      </div>

      <div className="grid gap-2">
        <label htmlFor="company" className="text-sm font-medium">
          Company
        </label>
        <input
          id="company"
          name="company"
          className="rounded-md border px-3 py-2"
          placeholder="Coastal Stays Ltd"
        />
      </div>

      <div className="grid gap-2">
        <label htmlFor="email" className="text-sm font-medium">
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          className="rounded-md border px-3 py-2"
          placeholder="client@example.com"
        />
      </div>

      <div className="grid gap-2">
        <label htmlFor="phone" className="text-sm font-medium">
          Phone
        </label>
        <input
          id="phone"
          name="phone"
          className="rounded-md border px-3 py-2"
          placeholder="+254..."
        />
      </div>

      <button type="submit" className="rounded-md bg-black px-4 py-2 text-white">
        Add Client
      </button>
    </form>
  );
}