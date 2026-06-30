import { createCommunity } from "../actions";

export default function NewCommunityPage({
  searchParams,
}: {
  searchParams: { error?: string };
}) {
  return (
    <div className="max-w-xl mx-auto">
      <h1 className="text-h3 font-bold">Create a community</h1>
      <p className="text-small text-text-secondary mt-1">
        Your community gets a discussion channel automatically. You become the owner.
      </p>

      {searchParams.error && (
        <div className="mt-4 text-small text-danger bg-[#fef2f2] border border-[#fecaca] rounded-sm px-3 py-2">
          {searchParams.error}
        </div>
      )}

      <form action={createCommunity} className="mt-6 flex flex-col gap-3">
        <label className="text-small font-semibold">Name</label>
        <input name="name" required placeholder="e.g. Leadership Lab" className="border border-border rounded-sm px-4 py-3" />
        <label className="text-small font-semibold mt-2">Description</label>
        <textarea name="description" rows={3} placeholder="What is this community about?" className="border border-border rounded-sm px-4 py-3 resize-none" />
        <button className="mt-3 rounded-sm bg-primary px-5 py-3 font-semibold text-white">Create community (+25 XP)</button>
      </form>
    </div>
  );
}
