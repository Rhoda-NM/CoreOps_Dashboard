export function Header() {
  return (
    <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b bg-white px-6">
      <div>
        <p className="text-sm text-gray-500">Workspace</p>
        <h2 className="font-semibold">CoreOps Studio</h2>
      </div>

      <div className="flex items-center gap-3">
        <div className="text-right">
          <p className="text-sm font-medium">Rhoda</p>
          <p className="text-xs text-gray-500">Owner</p>
        </div>

        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-black text-sm font-semibold text-white">
          R
        </div>
      </div>
    </header>
  );
}