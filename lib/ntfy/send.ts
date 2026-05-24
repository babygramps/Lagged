interface NtfySendInput {
  topic: string;
  title: string;
  body: string;
  tags?: string[];
  priority?: 1 | 2 | 3 | 4 | 5;
  click?: string;
  actions?: string;
}

export async function postNtfy(input: NtfySendInput): Promise<{ ok: boolean; status: number }> {
  const base = process.env.NTFY_BASE_URL ?? "https://ntfy.sh";
  const url = `${base}/${encodeURIComponent(input.topic)}`;
  const headers: Record<string, string> = {
    Title: input.title,
    Tags: (input.tags ?? []).join(","),
    Priority: String(input.priority ?? 3),
  };
  if (input.click) headers.Click = input.click;
  if (input.actions) headers.Actions = input.actions;

  try {
    const res = await fetch(url, {
      method: "POST",
      headers,
      body: input.body,
      signal: AbortSignal.timeout(5000),
    });
    return { ok: res.ok, status: res.status };
  } catch {
    return { ok: false, status: 0 };
  }
}
